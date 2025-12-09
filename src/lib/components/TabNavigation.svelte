<script lang="ts">
	import { backupStore, type TabId } from '$lib/stores/backup-store.svelte';

	interface Tab {
		id: TabId;
		label: string;
		count: number;
	}

	const tabs: Tab[] = $derived([
		{ id: 'fixtures', label: 'Fixtures', count: backupStore.fixtureCount },
		{ id: 'playbacks', label: 'Playbacks', count: backupStore.playbackCount },
		{ id: 'actions', label: 'Actions', count: backupStore.actionCount }
	]);
</script>

<nav class="border-b border-gray-200">
	<div class="flex gap-4">
		{#each tabs as tab}
			<button
				class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {backupStore.activeTab === tab.id
					? 'border-blue-600 text-blue-600'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				onclick={() => backupStore.setActiveTab(tab.id)}
			>
				{tab.label}
				{#if tab.count > 0}
					<span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
						{tab.count}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</nav>
