export interface SavedViewFilterParams {
	filter?: string
	s?: string
	sort_by?: string[]
	order_by?: string[]
}

export interface ISavedView {
	id: string
	name: string
	filterParams: SavedViewFilterParams
}
