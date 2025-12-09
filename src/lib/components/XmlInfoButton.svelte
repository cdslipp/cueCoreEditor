<script lang="ts">
	interface Props {
		xml: string | undefined;
	}

	let { xml }: Props = $props();
	let isOpen = $state(false);

	function formatXml(xml: string): string {
		// Simple XML formatting with indentation
		let formatted = '';
		let indent = 0;
		const lines = xml
			.replace(/></g, '>\n<')
			.replace(/>\s+</g, '>\n<')
			.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Decrease indent for closing tags
			if (trimmed.startsWith('</')) {
				indent = Math.max(0, indent - 1);
			}

			formatted += '  '.repeat(indent) + trimmed + '\n';

			// Increase indent for opening tags (not self-closing)
			if (
				trimmed.startsWith('<') &&
				!trimmed.startsWith('</') &&
				!trimmed.endsWith('/>') &&
				!trimmed.includes('</') // single-line element like <tag>content</tag>
			) {
				indent++;
			}
		}

		return formatted.trim();
	}
</script>

{#if xml}
	<div class="relative inline-block">
		<button
			type="button"
			class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-300"
			onclick={(e) => {
				e.stopPropagation();
				isOpen = !isOpen;
			}}
			title="View XML"
		>
			i
		</button>

		{#if isOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="fixed inset-0 z-40 bg-black/20"
				onclick={() => (isOpen = false)}
			></div>
			<div
				class="absolute right-0 top-full z-50 mt-2 max-h-96 w-[600px] overflow-auto rounded-lg border border-gray-300 bg-white p-4 shadow-xl"
			>
				<div class="mb-2 flex items-center justify-between">
					<h4 class="text-sm font-medium text-gray-700">Raw XML</h4>
					<button
						type="button"
						class="text-gray-400 hover:text-gray-600"
						aria-label="Close XML view"
						onclick={(e) => {
							e.stopPropagation();
							isOpen = false;
						}}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-400"><code>{formatXml(xml)}</code></pre>
			</div>
		{/if}
	</div>
{/if}
