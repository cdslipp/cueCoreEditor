<script lang="ts">
	import { backupStore } from '$lib/stores/backup-store.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import TabNavigation from '$lib/components/TabNavigation.svelte';
	import FixtureList from '$lib/components/fixtures/FixtureList.svelte';
	import PlaybackList from '$lib/components/playbacks/PlaybackList.svelte';
	import ActionList from '$lib/components/actions/ActionList.svelte';
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Header -->
	<header class="bg-white shadow">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
			<div>
				<h1 class="text-xl font-bold text-gray-900">Visual Productions Backup Explorer</h1>
				{#if backupStore.fileName}
					<p class="text-sm text-gray-500">
						{backupStore.fileName}
						{#if backupStore.data}
							— {backupStore.data.header.device} (FW {backupStore.data.header.versionFirmware})
						{/if}
					</p>
				{/if}
			</div>
			<div class="flex items-center gap-4">
				{#if backupStore.hasData}
					<button
						class="text-sm text-gray-500 hover:text-gray-700"
						onclick={() => backupStore.clear()}
					>
						Clear
					</button>
				{/if}
				<FileUpload />
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6">
		{#if backupStore.isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading...</div>
			</div>
		{:else if backupStore.error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
				<p class="font-medium">Error loading backup file</p>
				<p class="text-sm">{backupStore.error}</p>
			</div>
		{:else if backupStore.hasData}
			<TabNavigation />
			<div class="mt-6">
				{#if backupStore.activeTab === 'fixtures'}
					<FixtureList />
				{:else if backupStore.activeTab === 'playbacks'}
					<PlaybackList />
				{:else if backupStore.activeTab === 'actions'}
					<ActionList />
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<svg class="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<h2 class="mb-2 text-lg font-medium text-gray-900">No backup file loaded</h2>
				<p class="mb-6 text-gray-500">Load a Visual Productions backup.xml file to explore its contents</p>
				<FileUpload />
			</div>
		{/if}
	</main>
</div>
