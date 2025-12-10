/**
 * Visual Productions CueCore3 Personality Parser
 *
 * Decodes base64-encoded personality attributes from fixture XML.
 *
 * Two formats exist:
 * - Simple (16 bytes): 4 x 32-bit LE trait IDs for 4-channel fixtures
 * - Complex (>16 bytes): 12-byte header + channel entries with optional flags
 *
 * Trait IDs are 16-bit values in the lower 2 bytes of each 32-bit entry.
 * The high byte (byte 4) may contain flags (0x01 = group boundary marker).
 */

export interface ChannelEntry {
	index: number; // Channel position (0-indexed)
	traitId: number; // Raw 16-bit trait ID (lower 2 bytes)
	hasFlag: boolean; // True if high byte is 0x01 (group boundary)
}

export interface ParsedPersonality {
	format: 'simple' | 'complex';
	channelCount: number;
	channels: ChannelEntry[];
	headerValue?: number; // For complex format - first 4 bytes as 32-bit LE
	rawHex: string; // Hex dump for debugging
}

/**
 * Decode base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Read 32-bit little-endian value from byte array
 */
function readUint32LE(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

/**
 * Read 16-bit little-endian value from byte array
 */
function readUint16LE(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8);
}

/**
 * Convert bytes to hex string for debugging
 */
function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join(' ');
}

/**
 * Parse a simple personality format (16 bytes = 4 channels)
 * Each channel is a 32-bit LE value where lower 16 bits are the trait ID
 */
function parseSimplePersonality(bytes: Uint8Array): ParsedPersonality {
	const channels: ChannelEntry[] = [];
	const channelCount = Math.floor(bytes.length / 4);

	for (let i = 0; i < channelCount; i++) {
		const offset = i * 4;
		const traitId = readUint16LE(bytes, offset);
		const highByte = bytes[offset + 3];

		channels.push({
			index: i,
			traitId,
			hasFlag: highByte === 0x01
		});
	}

	return {
		format: 'simple',
		channelCount,
		channels,
		rawHex: bytesToHex(bytes)
	};
}

/**
 * Parse a complex personality format (>16 bytes)
 * Format: 12-byte header + channel entries
 *
 * Header structure (12 bytes):
 *   - Bytes 0-3: Header value (32-bit LE) - purpose unknown, may be fixture type ID
 *   - Bytes 4-7: Usually zeros
 *   - Bytes 8-11: Separator/flag (often 0x00000001)
 *
 * Channel entries (4 bytes each):
 *   - Bytes 0-1: Trait ID (16-bit LE)
 *   - Byte 2: Usually 0x00
 *   - Byte 3: Flag (0x01 = end of group/16-bit pair marker)
 */
function parseComplexPersonality(bytes: Uint8Array): ParsedPersonality {
	const channels: ChannelEntry[] = [];

	// Read header value (first 4 bytes)
	const headerValue = readUint32LE(bytes, 0);

	// Skip 12-byte header, parse remaining as channel entries
	const dataStart = 12;
	const dataLength = bytes.length - dataStart;
	const channelCount = Math.floor(dataLength / 4);

	for (let i = 0; i < channelCount; i++) {
		const offset = dataStart + i * 4;
		const traitId = readUint16LE(bytes, offset);
		const highByte = bytes[offset + 3];

		channels.push({
			index: i,
			traitId,
			hasFlag: highByte === 0x01
		});
	}

	return {
		format: 'complex',
		channelCount,
		channels,
		headerValue,
		rawHex: bytesToHex(bytes)
	};
}

/**
 * Parse a base64-encoded personality string
 *
 * @param base64 - Base64-encoded personality attribute from fixture XML
 * @returns ParsedPersonality or null if parsing fails
 */
export function parsePersonality(base64: string | undefined | null): ParsedPersonality | null {
	if (!base64 || base64.trim() === '') {
		return null;
	}

	try {
		const bytes = base64ToBytes(base64);

		if (bytes.length === 0) {
			return null;
		}

		// Simple format: exactly 16 bytes (4 channels x 4 bytes)
		// Could also be other multiples of 4 without header
		if (bytes.length === 16) {
			return parseSimplePersonality(bytes);
		}

		// Complex format: has 12-byte header + channel data
		if (bytes.length > 16 && (bytes.length - 12) % 4 === 0) {
			return parseComplexPersonality(bytes);
		}

		// Unknown format - try to parse as simple (consecutive 4-byte entries)
		if (bytes.length % 4 === 0) {
			return parseSimplePersonality(bytes);
		}

		// Can't parse - return raw hex for debugging
		return {
			format: 'simple',
			channelCount: 0,
			channels: [],
			rawHex: bytesToHex(bytes)
		};
	} catch {
		return null;
	}
}

/**
 * Get a formatted string of trait IDs for display
 * @param personality - Parsed personality
 * @returns String like "1001, 1002, 1003, 1005" or "1007, 1001, 1002*, 4001, ..." (* = flagged)
 */
export function formatTraitIds(personality: ParsedPersonality): string {
	return personality.channels.map((ch) => `${ch.traitId}${ch.hasFlag ? '*' : ''}`).join(', ');
}
