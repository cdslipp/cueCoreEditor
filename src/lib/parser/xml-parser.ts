import type {
	BackupFile,
	BackupHeader,
	Fixture,
	Playback,
	FixturePlayback,
	Cue,
	ActionList,
	Action,
	Trigger,
	Task,
	TaskParameter,
	Track
} from '$lib/types/backup';
import { parsePersonality } from './personality-parser';

// Helper to safely get attribute value
function attr(el: Element, name: string, defaultValue = ''): string {
	return el.getAttribute(name) ?? defaultValue;
}

function attrInt(el: Element, name: string, defaultValue = 0): number {
	const val = el.getAttribute(name);
	return val ? parseInt(val, 10) : defaultValue;
}

function attrBool(el: Element, name: string, defaultValue = false): boolean {
	const val = el.getAttribute(name);
	if (!val) return defaultValue;
	return val.toLowerCase() === 'true';
}

// Get the outer XML of an element
function getOuterXml(el: Element): string {
	const serializer = new XMLSerializer();
	return serializer.serializeToString(el);
}

// Parse the root <core> element header attributes
function parseHeader(doc: Document): BackupHeader {
	const core = doc.querySelector('core');
	if (!core) throw new Error('Invalid backup file: missing <core> element');

	return {
		device: attr(core, 'device'),
		versionPcb: attr(core, 'version_pcb'),
		versionFirmware: attr(core, 'version_firmware'),
		pcbSerial: attr(core, 'pcb_serial'),
		macAddress: attr(core, 'mac_address'),
		backupUtility: attr(core, 'backup_utility'),
		utilityVersion: attr(core, 'utility_version'),
		protocolVersion: attr(core, 'protocol_version')
	};
}

// Parse <patch> section
function parsePatch(doc: Document): Fixture[] {
	const fixtures: Fixture[] = [];
	const fixtureEls = doc.querySelectorAll('patch > fixture');

	fixtureEls.forEach((el) => {
		const personalityBase64 = attr(el, 'personality');
		fixtures.push({
			index: attrInt(el, 'index'),
			label: attr(el, 'label'),
			address: attrInt(el, 'address'),
			virtualDimmer: attrBool(el, 'virtualdimmer'),
			personality: personalityBase64,
			parsedPersonality: parsePersonality(personalityBase64) ?? undefined,
			uid: el.getAttribute('uid') ?? undefined,
			rawXml: getOuterXml(el)
		});
	});

	return fixtures.sort((a, b) => a.index - b.index);
}

// Parse <playbacks> section (metadata only, no frame data)
function parsePlaybacks(doc: Document): Playback[] {
	const playbacks: Playback[] = [];
	const playbackEls = doc.querySelectorAll('playbacks > playback');

	playbackEls.forEach((el, index) => {
		const cues: Cue[] = [];
		const cueEls = el.querySelectorAll('cues > cue');

		cueEls.forEach((cueEl, cueIndex) => {
			cues.push({
				index: cueIndex,
				label: 'Cue',
				duration: attr(cueEl, 'duration', 'halt'),
				condition: attr(cueEl, 'condition') || undefined,
				fade: cueEl.getAttribute('fade') ?? undefined
			});
		});

		playbacks.push({
			index,
			label: attr(el, 'label'),
			release: attr(el, 'release', '0s'),
			precedence: attr(el, 'precedence', 'LTP') as Playback['precedence'],
			repeat: attr(el, 'repeat', 'Off') as Playback['repeat'],
			timecodeOffset: attr(el, 'timecode_offset', '00:00:00.00'),
			cues
		});
	});

	return playbacks;
}

// Parse <fixture_playbacks> section (includes frame data)
function parseFixturePlaybacks(doc: Document): FixturePlayback[] {
	const playbacks: FixturePlayback[] = [];
	const playbackEls = doc.querySelectorAll('fixture_playbacks > playback');

	playbackEls.forEach((el) => {
		const cues: Cue[] = [];
		const cueEls = el.querySelectorAll('cue');

		cueEls.forEach((cueEl) => {
			// Collect frame data
			const frames: string[] = [];
			const frameFx: string[] = [];

			cueEl.querySelectorAll('frame').forEach((f) => {
				if (f.textContent) frames.push(f.textContent);
			});

			cueEl.querySelectorAll('frame_fx').forEach((f) => {
				if (f.textContent) frameFx.push(f.textContent);
			});

			cues.push({
				index: attrInt(cueEl, 'index'),
				label: attr(cueEl, 'label', 'Cue'),
				duration: attr(cueEl, 'duration', 'halt'),
				fade: cueEl.getAttribute('fade') ?? undefined,
				frames: frames.length > 0 ? frames : undefined,
				frameFx: frameFx.length > 0 ? frameFx : undefined,
				rawXml: getOuterXml(cueEl)
			});
		});

		// Normalize precedence (XML has mixed case: "Ltp" vs "LTP")
		const rawPrecedence = attr(el, 'precedence', 'LTP').toUpperCase();
		const precedence =
			rawPrecedence === 'HTP' ? 'HTP' : rawPrecedence === 'PRIORITY' ? 'Priority' : 'LTP';

		playbacks.push({
			index: attrInt(el, 'index'),
			label: attr(el, 'label'),
			release: attr(el, 'release', '0s'),
			precedence: precedence as FixturePlayback['precedence'],
			repeat: attr(el, 'repeat', 'Off') as FixturePlayback['repeat'],
			timecodeEnabled: attrBool(el, 'timecode_enabled'),
			timecodeOffset: attr(el, 'timecode_offset', '00:00:00.00'),
			cues,
			rawXml: getOuterXml(el)
		});
	});

	return playbacks.sort((a, b) => a.index - b.index);
}

// Parse <show_control> section
function parseShowControl(doc: Document): ActionList {
	const actionlistEl = doc.querySelector('show_control > actionlist');

	if (!actionlistEl) {
		return { enabled: false, source: '', actions: [] };
	}

	const actions: Action[] = [];
	const actionEls = actionlistEl.querySelectorAll('action');

	actionEls.forEach((el) => {
		// Parse trigger
		const triggerEl = el.querySelector('trigger');
		const trigger: Trigger = {
			type: triggerEl ? attr(triggerEl, 'type') : '',
			value: triggerEl ? attr(triggerEl, 'value') : '',
			flank: (triggerEl ? attr(triggerEl, 'flank', 'Change') : 'Change') as Trigger['flank']
		};

		// Parse tasks
		const tasks: Task[] = [];
		const taskEls = el.querySelectorAll('tasks > task');

		taskEls.forEach((taskEl) => {
			const parameters: TaskParameter[] = [];
			const paramEls = taskEl.querySelectorAll('parameter');

			paramEls.forEach((paramEl) => {
				parameters.push({
					index: attrInt(paramEl, 'index'),
					type: attr(paramEl, 'type'),
					value: paramEl.textContent ?? ''
				});
			});

			tasks.push({
				type: attr(taskEl, 'type') as Task['type'],
				feature: attr(taskEl, 'feature'),
				function: attr(taskEl, 'function'),
				parameters
			});
		});

		actions.push({
			label: attr(el, 'label'),
			trigger,
			tasks,
			rawXml: getOuterXml(el)
		});
	});

	return {
		enabled: attrBool(actionlistEl, 'enabled', true),
		source: attr(actionlistEl, 'source', 'UDP'),
		actions
	};
}

// Parse <tracks> section
function parseTracks(doc: Document): Track[] {
	const tracks: Track[] = [];
	const trackEls = doc.querySelectorAll('tracks > track');

	trackEls.forEach((el) => {
		tracks.push({
			index: attrInt(el, 'index'),
			label: attr(el, 'label'),
			version: attr(el, 'version'),
			frames: attrInt(el, 'frames'),
			filesize: attrInt(el, 'filesize'),
			sampleRate: attrInt(el, 'sample_rate'),
			external: attrBool(el, 'external')
		});
	});

	return tracks.sort((a, b) => a.index - b.index);
}

// Main parser entry point
export function parseBackupXml(xmlString: string): BackupFile {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlString, 'text/xml');

	// Check for parse errors
	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error(`XML Parse Error: ${parseError.textContent}`);
	}

	return {
		header: parseHeader(doc),
		patch: parsePatch(doc),
		playbacks: parsePlaybacks(doc),
		fixturePlaybacks: parseFixturePlaybacks(doc),
		showControl: parseShowControl(doc),
		tracks: parseTracks(doc)
	};
}
