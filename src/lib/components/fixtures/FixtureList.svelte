<script lang="ts">
	import { backupStore } from '$lib/stores/backup-store.svelte';
	import type { Fixture, FixtureGroup } from '$lib/types/backup';
	import XmlInfoButton from '$lib/components/XmlInfoButton.svelte';

	// Group fixtures by their label prefix (e.g., "Facade 1" -> "Facade")
	function groupFixtures(fixtures: Fixture[]): FixtureGroup[] {
		const groups = new Map<string, Fixture[]>();

		for (const fixture of fixtures) {
			// Extract group name from label (e.g., "DURA SPOT 60" stays as is, "Facade 1" -> "Facade")
			const match = fixture.label.match(/^(.+?)\s*\d*$/);
			const groupName = match ? match[1].trim() : fixture.label;

			if (!groups.has(groupName)) {
				groups.set(groupName, []);
			}
			groups.get(groupName)!.push(fixture);
		}

		// Convert to array and sort groups by first fixture index
		return Array.from(groups.entries())
			.map(([name, fixtures]) => ({ name, fixtures }))
			.sort((a, b) => a.fixtures[0].index - b.fixtures[0].index);
	}

	const fixtureGroups = $derived(
		backupStore.data ? groupFixtures(backupStore.data.patch) : []
	);
</script>

<div class="space-y-6">
	{#each fixtureGroups as group}
		<div class="rounded-lg border border-gray-200 bg-white">
			<div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
				<h3 class="font-semibold text-gray-900">
					{group.name}
					<span class="ml-2 text-sm font-normal text-gray-500">
						({group.fixtures.length} fixture{group.fixtures.length !== 1 ? 's' : ''})
					</span>
				</h3>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Index
							</th>
							<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Label
							</th>
							<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								DMX Address
							</th>
							<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								UID
							</th>
							<th class="w-10 px-4 py-2"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each group.fixtures as fixture}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
									{fixture.index}
								</td>
								<td class="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
									{fixture.label}
								</td>
								<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
									{fixture.address + 1}
									<span class="text-xs text-gray-400">(0-indexed: {fixture.address})</span>
								</td>
								<td class="whitespace-nowrap px-4 py-2 text-sm text-gray-400">
									{fixture.uid ?? '—'}
								</td>
								<td class="whitespace-nowrap px-4 py-2 text-sm">
									<XmlInfoButton xml={fixture.rawXml} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}
</div>
