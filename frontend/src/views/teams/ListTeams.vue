<template>
	<div
		class="content loader-container is-max-width-desktop"
		:class="{ 'is-loading': teamService.loading}"
	>
		<XButton
			:to="{name:'teams.create'}"
			class="is-pulled-end"
			icon="plus"
		>
			{{ $t('team.create.title') }}
		</XButton>

		<h1>{{ $t('team.title') }}</h1>
		<input
			v-if="teams.length > 0"
			v-model="query"
			v-cy="'team-search'"
			class="input search"
			type="text"
			:placeholder="$t('team.searchPlaceholder')"
		>
		<Card
			v-if="filteredTeams.length > 0"
			:padding="false"
			:has-content="false"
		>
			<ul class="teams">
				<li
					v-for="team in filteredTeams"
					:key="team.id"
				>
					<RouterLink :to="{name: 'teams.edit', params: {id: team.id}}">
						<p>
							{{ team.name }}
						</p>
					</RouterLink>
				</li>
			</ul>
		</Card>
		<p
			v-else-if="teams.length > 0"
			v-cy="'team-search-empty'"
			class="has-text-centered has-text-grey is-italic"
		>
			{{ $t('team.searchEmpty') }}
		</p>
		<p
			v-else-if="!teamService.loading"
			class="has-text-centered has-text-grey is-italic"
		>
			{{ $t('team.noTeams') }}
			<RouterLink :to="{name: 'teams.create'}">
				{{ $t('team.create.title') }}.
			</RouterLink>
		</p>
	</div>
</template>

<script setup lang="ts">
import {computed, ref, shallowReactive} from 'vue'
import { useI18n } from 'vue-i18n'

import Card from '@/components/misc/Card.vue'
import TeamService from '@/services/team'
import type {ITeam} from '@/modelTypes/ITeam'
import { useTitle } from '@/composables/useTitle'

const { t } = useI18n({useScope: 'global'})
useTitle(() => t('team.title'))

const teams = ref<ITeam[]>([])
const teamService = shallowReactive(new TeamService())
teamService.getAll().then((result) => {
	teams.value = result
})

const query = ref('')
const filteredTeams = computed(() => {
	const search = query.value.trim().toLowerCase()

	if (search === '') {
		return teams.value
	}

	return teams.value.filter(team => team.name.toLowerCase().includes(search))
})
</script>

<style lang="scss" scoped>
.search {
  margin-block-end: 1rem;
}

ul.teams {
  padding: 0;
  margin-block-start: 0;
  margin-inline-start: 0;
  border-radius: $radius;
  overflow: hidden;

  li {
    list-style: none;
    margin: 0;
    border-inline-end: 1px solid var(--grey-200);

    a {
      color: var(--text);
      display: block;
      padding: 0.5rem 1rem;
      transition: background-color $transition;

      &:hover {
        background: var(--grey-100);
      }
    }
  }

  li:last-child {
    border-inline-end: none;
  }
}
</style>
