/**
 * Visual Productions CueCore3 Frame Data Parser
 *
 * Frame format appears to be a sparse DMX format:
 * - Byte 0-1: Frame sequence/counter (16-bit LE)
 * - Then repeating 4-byte records: Address (16-bit LE) + Value (16-bit LE, low byte is DMX value)
 *
 * Only non-zero values are stored (sparse format for efficiency).
 */

export interface FrameChannel {
	address: number; // DMX address (1-indexed for display)
	value: number; // DMX value 0-255
}

export interface ParsedFrame {
	frameIndex: number;
	channels: FrameChannel[];
}

/**
 * Decode a base64-encoded frame into structured data
 */
export function parseFrame(base64Data: string): ParsedFrame | null {
	try {
		const binary = atob(base64Data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		if (bytes.length < 2) {
			return null;
		}

		// First 2 bytes are frame sequence (16-bit LE)
		const frameIndex = bytes[0] | (bytes[1] << 8);
		const channels: FrameChannel[] = [];

		// Process 4-byte records: address (2 bytes) + value (2 bytes)
		for (let i = 2; i + 3 < bytes.length; i += 4) {
			const address = bytes[i] | (bytes[i + 1] << 8);
			// Value is 2 bytes, but DMX only uses 0-255, take low byte
			// The high byte might be for 16-bit precision or flags
			const valueLow = bytes[i + 2];
			const valueHigh = bytes[i + 3];

			// Use low byte as DMX value, but if high byte is 0xFF,
			// it might indicate "full" (255)
			const value = valueHigh === 0xFF ? 255 : valueLow;

			channels.push({
				address: address + 1, // Convert to 1-indexed for display
				value
			});
		}

		return { frameIndex, channels };
	} catch {
		return null;
	}
}

/**
 * Parse all frames and merge into a single DMX state (sparse map)
 * Uses the first frame as the base state
 */
export function parseFramesToDmxState(frames: string[]): Map<number, number> {
	const dmxState = new Map<number, number>();

	if (frames.length === 0) return dmxState;

	// Parse first frame (usually contains the full state)
	const firstFrame = parseFrame(frames[0]);
	if (firstFrame) {
		for (const channel of firstFrame.channels) {
			dmxState.set(channel.address, channel.value);
		}
	}

	return dmxState;
}

/**
 * Map DMX state to fixtures based on their addresses
 */
export interface FixtureChannelData {
	fixtureIndex: number;
	fixtureLabel: string;
	startAddress: number;
	channels: { name: string; traitId?: number; value: number }[];
}

import type { ParsedPersonality } from './personality-parser';

export interface FixtureWithPersonality {
	index: number;
	label: string;
	address: number;
	parsedPersonality?: ParsedPersonality;
}

export function mapDmxToFixtures(
	dmxState: Map<number, number>,
	fixtures: FixtureWithPersonality[],
	defaultChannelCount: number = 4 // Fallback if no personality
): FixtureChannelData[] {
	const result: FixtureChannelData[] = [];

	for (const fixture of fixtures) {
		const startAddr = fixture.address + 1; // Convert to 1-indexed
		const channels: { name: string; traitId?: number; value: number }[] = [];
		let hasData = false;

		// Use personality channel count if available, otherwise default
		const personality = fixture.parsedPersonality;
		const channelCount = personality?.channelCount ?? defaultChannelCount;

		for (let i = 0; i < channelCount; i++) {
			const addr = startAddr + i;
			const value = dmxState.get(addr) ?? 0;

			// Get trait ID from personality if available
			const traitId = personality?.channels[i]?.traitId;
			const hasFlag = personality?.channels[i]?.hasFlag;

			// Generate name: use trait ID if available, otherwise generic
			let name: string;
			if (traitId !== undefined) {
				name = `${traitId}${hasFlag ? '*' : ''}`;
			} else {
				name = `Ch${i + 1}`;
			}

			channels.push({
				name,
				traitId,
				value
			});
			if (value > 0) hasData = true;
		}

		if (hasData) {
			result.push({
				fixtureIndex: fixture.index,
				fixtureLabel: fixture.label,
				startAddress: startAddr,
				channels
			});
		}
	}

	return result;
}

/**
 * Get a hex dump view of the raw frame data for debugging
 */
export function getFrameHexDump(base64Data: string): string {
	try {
		const binary = atob(base64Data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		const lines: string[] = [];
		for (let i = 0; i < bytes.length; i += 16) {
			const hex = Array.from(bytes.slice(i, i + 16))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join(' ');
			const ascii = Array.from(bytes.slice(i, i + 16))
				.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
				.join('');
			lines.push(`${i.toString(16).padStart(4, '0')}: ${hex.padEnd(48)} ${ascii}`);
		}

		return lines.join('\n');
	} catch {
		return 'Failed to decode';
	}
}
