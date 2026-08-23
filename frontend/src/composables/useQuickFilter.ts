import {computed} from 'vue'
import {useRouteQuery} from '@vueuse/router'

/**
 * Syncs a client-side quick-filter string with the `?q=` URL query parameter.
 * Reading returns '' when the param is absent; writing '' removes it from the URL.
 */
export function useQuickFilter() {
	const raw = useRouteQuery('q')

	const query = computed({
		get(): string { return raw.value ?? '' },
		set(v: string) { raw.value = v || undefined },
	})

	return {query}
}
