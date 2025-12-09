<script lang="ts">
	import { page } from '$app/state';
	import { backupStore } from '$lib/stores/backup-store.svelte';
	import type { Cue } from '$lib/types/backup';
	import XmlInfoButton from '$lib/components/XmlInfoButton.svelte';
	import {
		parseFrame,
		parseFramesToDmxState,
		mapDmxToFixtures,
		getFrameHexDump,
		type ParsedFrame,
		type FixtureChannelData
	} from '$lib/parser/frame-parser';

	// Get route params
	const playbackIndex = $derived(parseInt(page.params.playbackIndex ?? '0', 10));
	const cueIndex = $derived(parseInt(page.params.cueIndex ?? '0', 10));

	// Find the playback and cue
	const playback = $derived(
		backupStore.data?.fixturePlaybacks.find((p) => p.index === playbackIndex)
	);
	const cue = $derived(playback?.cues.find((c) => c.index === cueIndex));

	// Get fixtures for frame data mapping
	const fixtures = $derived(backupStore.data?.patch ?? []);

	// Parse frames using new parser
	const parsedFirstFrame = $derived.by((): ParsedFrame | null => {
		if (!cue?.frames || cue.frames.length === 0) return null;
		return parseFrame(cue.frames[0]);
	});

	const dmxState = $derived.by(() => {
		if (!cue?.frames) return new Map<number, number>();
		return parseFramesToDmxState(cue.frames);
	});

	const fixtureData = $derived.by((): FixtureChannelData[] => {
		if (dmxState.size === 0 || fixtures.length === 0) return [];
		return mapDmxToFixtures(dmxState, fixtures, 4);
	});

	// Get color from RGBW values
	function rgbwToColor(channels: { name: string; value: number }[]): string {
		const r = channels.find((c) => c.name === 'R')?.value ?? 0;
		const g = channels.find((c) => c.name === 'G')?.value ?? 0;
		const b = channels.find((c) => c.name === 'B')?.value ?? 0;
		return `rgb(${r}, ${g}, ${b})`;
	}

	// View mode for frame data
	let viewMode = $state<'fixtures' | 'raw' | 'hex'>('fixtures');
</script>

<svelte:head>
	<title>Cue {cueIndex + 1} - Playback {playbackIndex + 1}</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">
	<!-- Header -->
	<header class="border-b border-gray-700 bg-gray-800">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
			<div class="flex items-center gap-4">
				<a
					href="/"
					class="flex items-center gap-2 text-gray-400 hover:text-white"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</a>
				<div class="h-6 w-px bg-gray-600"></div>
				<div>
					<h1 class="text-xl font-bold">
						Playback {playbackIndex + 1} / Cue {cueIndex + 1}
					</h1>
					{#if playback && cue}
						<p class="text-sm text-gray-400">
							{playback.label} &mdash; {cue.label}
						</p>
					{/if}
				</div>
			</div>
			{#if cue}
				<XmlInfoButton xml={cue.rawXml} />
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6">
		{#if !backupStore.hasData}
			<div class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-6 text-center">
				<p class="text-yellow-400">No backup file loaded. Please load a file first.</p>
				<a href="/" class="mt-4 inline-block rounded bg-yellow-500 px-4 py-2 text-black hover:bg-yellow-400">
					Go to Home
				</a>
			</div>
		{:else if !playback}
			<div class="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
				<p class="text-red-400">Playback {playbackIndex + 1} not found.</p>
				<a href="/" class="mt-4 inline-block rounded bg-red-500 px-4 py-2 text-white hover:bg-red-400">
					Go to Home
				</a>
			</div>
		{:else if !cue}
			<div class="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
				<p class="text-red-400">Cue {cueIndex + 1} not found in Playback {playbackIndex + 1}.</p>
				<a href="/" class="mt-4 inline-block rounded bg-red-500 px-4 py-2 text-white hover:bg-red-400">
					Go to Home
				</a>
			</div>
		{:else}
			<!-- Cue Properties - ETC Eos style tombstones -->
			<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
				<!-- Duration tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Duration</div>
					<div class="text-2xl font-mono font-bold text-cyan-400">{cue.duration}</div>
				</div>

				<!-- Fade tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Fade</div>
					<div class="text-2xl font-mono font-bold text-cyan-400">{cue.fade ?? '—'}</div>
				</div>

				<!-- Frames count tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Frames</div>
					<div class="text-2xl font-mono font-bold text-green-400">{cue.frames?.length ?? 0}</div>
				</div>

				<!-- Fixtures with data tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Active Fixtures</div>
					<div class="text-2xl font-mono font-bold text-amber-400">{fixtureData.length}</div>
				</div>

				<!-- Cue index tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Cue #</div>
					<div class="text-2xl font-mono font-bold text-purple-400">{cue.index + 1}</div>
				</div>

				<!-- Condition tombstone -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div class="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Condition</div>
					<div class="text-lg font-mono font-bold text-gray-400">{cue.condition ?? 'None'}</div>
				</div>
			</div>

			<!-- Navigation between cues -->
			<div class="mb-8 flex items-center justify-between">
				<div>
					{#if cueIndex > 0}
						<a
							href="/playback/{playbackIndex}/{cueIndex - 1}"
							class="inline-flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							Cue {cueIndex}
						</a>
					{/if}
				</div>
				<div class="text-sm text-gray-500">
					Cue {cueIndex + 1} of {playback.cues.length}
				</div>
				<div>
					{#if cueIndex < playback.cues.length - 1}
						<a
							href="/playback/{playbackIndex}/{cueIndex + 1}"
							class="inline-flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
						>
							Cue {cueIndex + 2}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</a>
					{/if}
				</div>
			</div>

			<!-- Fixture values grid - Blind mode style -->
			<div class="rounded-lg border border-gray-700 bg-gray-800">
				<div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
					<div>
						<h2 class="font-semibold">Fixture Values</h2>
						<p class="text-sm text-gray-400">DMX channel values for active fixtures</p>
					</div>
					<div class="flex gap-1">
						<button
							class="rounded px-3 py-1 text-sm {viewMode === 'fixtures' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
							onclick={() => (viewMode = 'fixtures')}
						>
							Fixtures
						</button>
						<button
							class="rounded px-3 py-1 text-sm {viewMode === 'raw' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
							onclick={() => (viewMode = 'raw')}
						>
							Raw Channels
						</button>
						<button
							class="rounded px-3 py-1 text-sm {viewMode === 'hex' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
							onclick={() => (viewMode = 'hex')}
						>
							Hex Dump
						</button>
					</div>
				</div>

				{#if viewMode === 'fixtures'}
					{#if fixtureData.length > 0}
						<div class="grid gap-2 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
							{#each fixtureData as fixture}
								<div class="rounded border border-gray-600 bg-gray-900 p-3">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium text-gray-300">{fixture.fixtureLabel}</span>
										<span class="text-xs text-gray-500">#{fixture.fixtureIndex}</span>
									</div>
									<!-- Color preview -->
									<div
										class="mb-2 h-8 rounded"
										style="background-color: {rgbwToColor(fixture.channels)}; border: 1px solid rgba(255,255,255,0.2);"
									></div>
									<!-- Channel values -->
									<div class="grid grid-cols-4 gap-1 text-center text-xs">
										{#each fixture.channels as channel}
											<div>
												<div class="{channel.name === 'R' ? 'text-red-400' : channel.name === 'G' ? 'text-green-400' : channel.name === 'B' ? 'text-blue-400' : 'text-gray-300'}">{channel.value}</div>
												<div class="text-gray-500">{channel.name}</div>
											</div>
										{/each}
									</div>
									<div class="mt-1 text-center text-xs text-gray-500">
										@{fixture.startAddress}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">
							<p>No fixture data available for this cue.</p>
							<p class="mt-2 text-sm">This cue may contain complex frame data that requires further parsing.</p>
						</div>
					{/if}
				{:else if viewMode === 'raw'}
					{#if parsedFirstFrame}
						<div class="max-h-96 overflow-auto p-4">
							<div class="mb-2 text-sm text-gray-400">
								Frame Index: {parsedFirstFrame.frameIndex} | Channels with data: {parsedFirstFrame.channels.length}
							</div>
							<table class="w-full text-sm">
								<thead class="text-left text-xs uppercase text-gray-500">
									<tr>
										<th class="pb-2 pr-4">Address</th>
										<th class="pb-2 pr-4">Value</th>
										<th class="pb-2 pr-4">Percentage</th>
										<th class="pb-2">Bar</th>
									</tr>
								</thead>
								<tbody>
									{#each parsedFirstFrame.channels as channel}
										<tr class="border-t border-gray-700">
											<td class="py-1 pr-4 font-mono text-cyan-400">{channel.address}</td>
											<td class="py-1 pr-4 font-mono">{channel.value}</td>
											<td class="py-1 pr-4 text-gray-400">{Math.round((channel.value / 255) * 100)}%</td>
											<td class="py-1">
												<div class="h-2 w-24 rounded bg-gray-700">
													<div
														class="h-2 rounded bg-cyan-500"
														style="width: {(channel.value / 255) * 100}%"
													></div>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No frame data to display</div>
					{/if}
				{:else if viewMode === 'hex'}
					{#if cue.frames && cue.frames.length > 0}
						<div class="max-h-96 overflow-auto p-4">
							{#each cue.frames.slice(0, 5) as frame, i}
								<div class="mb-4">
									<div class="mb-1 text-sm text-gray-400">Frame {i + 1}:</div>
									<pre class="overflow-x-auto rounded bg-gray-900 p-2 font-mono text-xs text-green-400">{getFrameHexDump(frame)}</pre>
								</div>
							{/each}
							{#if cue.frames.length > 5}
								<div class="text-sm text-gray-500">... and {cue.frames.length - 5} more frames</div>
							{/if}
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No frame data to display</div>
					{/if}
				{/if}
			</div>

			{/if}
	</main>
</div>
