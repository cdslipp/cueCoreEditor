import type { BackupFile } from '$lib/types/backup';
import { parseBackupXml } from '$lib/parser/xml-parser';

export type TabId = 'fixtures' | 'playbacks' | 'actions';

// Using a class so we can export reactive state
class BackupStore {
	data = $state<BackupFile | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);
	activeTab = $state<TabId>('fixtures');
	fileName = $state<string | null>(null);

	async loadFile(file: File): Promise<void> {
		this.isLoading = true;
		this.error = null;

		try {
			const text = await file.text();
			this.data = parseBackupXml(text);
			this.fileName = file.name;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to parse backup file';
			this.data = null;
			this.fileName = null;
		} finally {
			this.isLoading = false;
		}
	}

	setActiveTab(tab: TabId): void {
		this.activeTab = tab;
	}

	clear(): void {
		this.data = null;
		this.error = null;
		this.fileName = null;
		this.activeTab = 'fixtures';
	}

	// Computed getters for convenience
	get fixtureCount(): number {
		return this.data?.patch.length ?? 0;
	}

	get playbackCount(): number {
		return this.data?.fixturePlaybacks.length ?? 0;
	}

	get actionCount(): number {
		return this.data?.showControl.actions.length ?? 0;
	}

	get hasData(): boolean {
		return this.data !== null;
	}
}

// Export a singleton instance
export const backupStore = new BackupStore();
