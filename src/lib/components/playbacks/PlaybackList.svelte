<script lang="ts">
	import { backupStore } from '$lib/stores/backup-store.svelte';
	import XmlInfoButton from '$lib/components/XmlInfoButton.svelte';
	import type { Action, FixturePlayback } from '$lib/types/backup';

	// Track which playbacks are expanded
	let expandedPlaybacks = $state<Set<number>>(new Set());

	function toggleExpand(index: number) {
		if (expandedPlaybacks.has(index)) {
			expandedPlaybacks.delete(index);
		} else {
			expandedPlaybacks.add(index);
		}
		expandedPlaybacks = new Set(expandedPlaybacks);
	}

	// Always show 16 playbacks numbered 1-16
	const allPlaybacks = $derived.by((): (FixturePlayback | null)[] => {
		const existing = backupStore.data?.fixturePlaybacks ?? [];
		return Array.from({ length: 16 }, (_, i) => {
			return existing.find((p) => p.index === i) ?? null;
		});
	});

	// Build a map of playback index -> actions that reference it
	interface ActionReference {
		action: Action;
		taskSummary: string;
	}

	const playbackToActions = $derived.by((): Map<number, ActionReference[]> => {
		const map = new Map<number, ActionReference[]>();
		const actions = backupStore.data?.showControl.actions ?? [];

		for (const action of actions) {
			for (const task of action.tasks) {
				if (task.type === 'Playback') {
					const param1 = task.parameters.find((p) => p.index === 1);
					if (param1?.value) {
						const playbackNum = parseInt(param1.value, 10);
						// Playback numbers in actions are 1-indexed, our index is 0-indexed
						const playbackIndex = playbackNum - 1;

						if (!map.has(playbackIndex)) {
							map.set(playbackIndex, []);
						}

						// Create a summary of what this action does to the playback
						let taskSummary = `${task.feature} ${task.function}`;
						const param2 = task.parameters.find((p) => p.index === 2);
						if (task.feature === 'Jump' && param2) {
							taskSummary = `Jump to Cue ${param2.value}`;
						} else if (task.feature === 'Transport') {
							taskSummary = task.function;
						} else if (task.feature === 'Intensity' && param2) {
							taskSummary = `${task.function} Intensity (${param2.value})`;
						}

						map.get(playbackIndex)!.push({
							action,
							taskSummary
						});
					}
				}
			}
		}

		return map;
	});

	function getActionsForPlayback(playbackIndex: number): ActionReference[] {
		return playbackToActions.get(playbackIndex) ?? [];
	}
</script>

<div class="space-y-3">
	{#each allPlaybacks as playback, i}
		{@const playbackNum = i + 1}
		{@const isExpanded = playback ? expandedPlaybacks.has(playback.index) : false}
		{@const hasCues = playback ? playback.cues.length > 0 : false}
		{@const actionCount = getActionsForPlayback(i).length}
		<div class="rounded-lg border border-gray-200 bg-white {!playback ? 'opacity-50' : ''}">
			<button
				class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-white"
				onclick={() => playback && toggleExpand(playback.index)}
				disabled={!hasCues}
			>
				<div class="flex items-center gap-3">
					<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-indigo-100 text-sm font-bold text-indigo-700">
						{playbackNum}
					</span>
					{#if hasCues}
						<svg
							class="h-4 w-4 text-gray-400 transition-transform {isExpanded ? 'rotate-90' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					{:else}
						<div class="h-4 w-4"></div>
					{/if}
					<div>
						<h3 class="font-medium text-gray-900">
							{playback?.label || `Playback ${playbackNum}`}
						</h3>
						<p class="text-sm text-gray-500">
							{#if playback}
								{playback.cues.length} cue{playback.cues.length !== 1 ? 's' : ''}
							{:else}
								Empty
							{/if}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-4 text-sm">
					{#if playback}
						<span class="rounded bg-gray-100 px-2 py-1 text-gray-600">
							{playback.precedence}
						</span>
						{#if playback.repeat === 'Loop'}
							<span class="rounded bg-blue-100 px-2 py-1 text-blue-700">
								Loop
							</span>
						{/if}
						<span class="text-gray-500">
							Release: {playback.release}
						</span>
						{#if actionCount > 0}
							<span class="rounded bg-purple-100 px-2 py-1 text-purple-700" title="{actionCount} action{actionCount !== 1 ? 's' : ''} reference this playback">
								{actionCount} action{actionCount !== 1 ? 's' : ''}
							</span>
						{/if}
						<XmlInfoButton xml={playback.rawXml} />
					{/if}
				</div>
			</button>

			{#if playback && isExpanded && hasCues}
				{@const actionRefs = getActionsForPlayback(i)}
				<div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
					<table class="min-w-full">
						<thead>
							<tr class="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								<th class="pb-2 pr-4">Cue</th>
								<th class="pb-2 pr-4">Label</th>
								<th class="pb-2 pr-4">Duration</th>
								<th class="pb-2 pr-4">Fade</th>
								<th class="pb-2 pr-4">Frames</th>
								<th class="pb-2 w-10"></th>
							</tr>
						</thead>
						<tbody class="text-sm">
							{#each playback.cues as cue}
								<tr class="border-t border-gray-200 hover:bg-gray-100">
									<td class="py-2 pr-4 text-gray-500">{cue.index + 1}</td>
									<td class="py-2 pr-4 text-gray-900">
										<a
											href="/playback/{playback.index}/{cue.index}"
											class="text-indigo-600 hover:text-indigo-800 hover:underline"
										>
											{cue.label}
										</a>
									</td>
									<td class="py-2 pr-4 text-gray-500">{cue.duration}</td>
									<td class="py-2 pr-4 text-gray-500">{cue.fade ?? '—'}</td>
									<td class="py-2 pr-4 text-gray-400">
										{cue.frames?.length ?? 0} frame{(cue.frames?.length ?? 0) !== 1 ? 's' : ''}
									</td>
									<td class="py-2">
										<XmlInfoButton xml={cue.rawXml} />
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Action references section -->
				{#if actionRefs.length > 0}
					<div class="border-t border-gray-200 bg-purple-50 px-4 py-3">
						<h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-purple-700">
							Referenced by {actionRefs.length} Action{actionRefs.length !== 1 ? 's' : ''}
						</h4>
						<div class="flex flex-wrap gap-2">
							{#each actionRefs as { action, taskSummary }}
								<div class="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm">
									<span class="font-medium text-gray-900">{action.label}</span>
									<span class="text-gray-400">→</span>
									<span class="text-purple-700">{taskSummary}</span>
									<span class="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">
										{action.trigger.type}: "{action.trigger.value}"
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/each}
</div>
