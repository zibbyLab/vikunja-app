export interface ISavedViewFilters {
	filter: string
	filter_include_nulls: boolean
	s: string
}

export interface ISavedView {
	id: string
	title: string
	projectId: number
	filters: ISavedViewFilters
	createdAt: string
	updatedAt: string
}
