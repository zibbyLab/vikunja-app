import {useProjectStore} from '@/stores/projects'
import ProjectViewService from '@/services/projectViews'
import ProjectViewModel from '@/models/projectView'
import type {IProject} from '@/modelTypes/IProject'
import type {TaskFilterParams} from '@/services/taskCollection'

export function useSavedViews() {
	const projectStore = useProjectStore()

	async function addSavedView(
		projectId: IProject['id'],
		name: string,
		filterParams: TaskFilterParams,
	): Promise<void> {
		const trimmedName = name.trim()
		if (!trimmedName) {
			throw new Error('nameEmpty')
		}

		const project = projectStore.projects[projectId]
		if (project?.views.some(v => v.title === trimmedName)) {
			throw new Error('nameExists')
		}

		const viewService = new ProjectViewService()
		const newView = new ProjectViewModel({
			title: trimmedName,
			projectId,
			viewKind: 'list',
			filter: {
				filter: filterParams.filter,
				s: filterParams.s,
				// The sort fields on IFilters have a narrower type; cast to any to
				// keep the composable generic without duplicating the sort-field union.
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				sort_by: filterParams.sort_by as any,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				order_by: filterParams.order_by as any,
				filter_include_nulls: false,
			},
		})

		const created = await viewService.create(newView)
		projectStore.setProjectView(created)
	}

	return {addSavedView}
}
