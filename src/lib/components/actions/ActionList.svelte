<script lang="ts">
	import { backupStore } from '$lib/stores/backup-store.svelte';
	import type { Task } from '$lib/types/backup';
	import XmlInfoButton from '$lib/components/XmlInfoButton.svelte';

	let expandedActions = $state<Set<string>>(new Set());

	function toggleExpand(label: string) {
		if (expandedActions.has(label)) {
			expandedActions.delete(label);
		} else {
			expandedActions.add(label);
		}
		expandedActions = new Set(expandedActions);
	}

	function summarizeTask(task: Task): string {
		const param1 = task.parameters.find(p => p.index === 1);
		const param2 = task.parameters.find(p => p.index === 2);

		if (task.type === 'Playback') {
			const playbackRef = param1?.value ?? '?';
			if (task.feature === 'Transport') {
				return `${task.function} Playback ${playbackRef}`;
			} else if (task.feature === 'Jump') {
				const cue = param2?.value ?? '?';
				return `Jump Playback ${playbackRef} to Cue ${cue}`;
			} else if (task.feature === 'Intensity') {
				const intensity = param2?.value ?? '?';
				return `${task.function} Playback ${playbackRef} Intensity (${intensity})`;
			}
			return `${task.feature} ${task.function} on Playback ${playbackRef}`;
		} else if (task.type === 'Fixture') {
			const fixtureRange = param1?.value ?? '?';
			const value = param2?.value ?? '';
			if (task.feature === 'RGB' || task.feature === 'White' || task.feature === 'UV') {
				return `Set ${task.feature} on Fixtures ${fixtureRange} to ${value}`;
			} else if (task.feature === 'Intensity') {
				return `${task.function} Intensity on Fixtures ${fixtureRange} (${value})`;
			}
			return `${task.feature} ${task.function} on Fixtures ${fixtureRange}`;
		}
		return `${task.type}: ${task.feature} ${task.function}`;
	}

	const actions = $derived(backupStore.data?.showControl.actions ?? []);
	const showControlEnabled = $derived(backupStore.data?.showControl.enabled ?? false);
	const showControlSource = $derived(backupStore.data?.showControl.source ?? '');
</script>

<div class="space-y-4">
	{#if actions.length > 0}
		<div class="flex items-center gap-2 text-sm text-gray-600">
			<span class="rounded bg-gray-100 px-2 py-1">Source: {showControlSource}</span>
			<span class="rounded {showControlEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1">
				{showControlEnabled ? 'Enabled' : 'Disabled'}
			</span>
		</div>
	{/if}

	<div class="space-y-2">
		{#each actions as action}
			{@const isExpanded = expandedActions.has(action.label)}
			<div class="rounded-lg border border-gray-200 bg-white">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
					onclick={() => toggleExpand(action.label)}
				>
					<div class="flex items-center gap-3">
						<svg
							class="h-4 w-4 text-gray-400 transition-transform {isExpanded ? 'rotate-90' : ''}"
							fill="none" stroke="currentColor" viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						<div>
							<h3 class="font-medium text-gray-900">{action.label}</h3>
							<p class="text-sm text-gray-500">{action.tasks.length} task{action.tasks.length !== 1 ? 's' : ''}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded bg-purple-100 px-2 py-1 text-sm text-purple-700">
							{action.trigger.type}: "{action.trigger.value}"
						</span>
						<span class="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">{action.trigger.flank}</span>
						<XmlInfoButton xml={action.rawXml} />
					</div>
				</button>

				{#if isExpanded}
					<div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
						<h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Tasks</h4>
						<ul class="space-y-2">
							{#each action.tasks as task, i}
								<li class="flex items-start gap-2 text-sm">
									<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">{i + 1}</span>
									<div>
										<p class="text-gray-900">{summarizeTask(task)}</p>
										<p class="text-xs text-gray-400">{task.type} / {task.feature} / {task.function}</p>
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if actions.length === 0}
		<p class="py-8 text-center text-gray-500">No actions found</p>
	{/if}
</div>
