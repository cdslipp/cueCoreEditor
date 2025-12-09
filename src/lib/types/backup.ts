// Visual Productions CueCore3 Backup File Types

export interface BackupFile {
	header: BackupHeader;
	patch: Fixture[];
	playbacks: Playback[];
	fixturePlaybacks: FixturePlayback[];
	showControl: ActionList;
	tracks: Track[];
}

export interface BackupHeader {
	device: string;
	versionPcb: string;
	versionFirmware: string;
	pcbSerial: string;
	macAddress: string;
	backupUtility: string;
	utilityVersion: string;
	protocolVersion: string;
}

export interface Fixture {
	index: number;
	label: string;
	address: number;
	virtualDimmer: boolean;
	personality: string; // base64 encoded
	uid?: string;
	rawXml?: string; // Original XML for debugging
}

export interface Cue {
	index: number;
	label: string;
	duration: string;
	fade?: string;
	condition?: string;
	frames?: string[]; // base64 encoded DMX data (from fixture_playbacks)
	frameFx?: string[]; // base64 encoded effect data (from fixture_playbacks)
	rawXml?: string; // Original XML for debugging
}

export interface Playback {
	index: number;
	label: string;
	release: string;
	precedence: 'LTP' | 'HTP' | 'Priority';
	repeat: 'Loop' | 'Off';
	timecodeOffset: string;
	cues: Cue[];
}

export interface FixturePlayback extends Playback {
	timecodeEnabled: boolean;
	rawXml?: string; // Original XML for debugging
	// Cues in FixturePlayback include frame/frameFx data
}

export interface ActionList {
	enabled: boolean;
	source: string;
	actions: Action[];
}

export interface Action {
	label: string;
	trigger: Trigger;
	tasks: Task[];
	rawXml?: string; // Original XML for debugging
}

export interface Trigger {
	type: string;
	value: string;
	flank: 'Change' | 'Rise' | 'Fall';
}

export interface Task {
	type: 'Playback' | 'Fixture';
	feature: string;
	function: string;
	parameters: TaskParameter[];
}

export interface TaskParameter {
	index: number;
	type: string;
	value: string;
}

export interface Track {
	index: number;
	label: string;
	version: string;
	frames: number;
	filesize: number;
	sampleRate: number;
	external: boolean;
}

// Helper type for fixture grouping
export interface FixtureGroup {
	name: string;
	fixtures: Fixture[];
}
