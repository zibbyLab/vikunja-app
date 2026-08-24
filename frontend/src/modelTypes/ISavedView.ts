export interface ISavedView {
	id: string
	name: string
	projectId: number
	filterParams: {
		filter: string
		s: string
		sort_by?: string[]
		order_by?: string[]
	}
	created: Date
	updated: Date
}
