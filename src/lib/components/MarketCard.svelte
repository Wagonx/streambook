<script>
	import { createEventDispatcher } from 'svelte';
	
	export let eventTitle;
	export let overLine;
	export let overOdds;
	export let underOdds;
	export let overMarketId;
	export let underMarketId;

	const dispatch = createEventDispatcher();

	function placeBet(marketId, type, odds, line) {
		dispatch('placeBet', {
			marketId,
			type,
			odds,
			line,
			eventTitle,
			description: `${type === 'over' ? 'Over' : 'Under'} ${line}`
		});
	}
</script>

<div class="market-card">
	<h3 class="event-title">{eventTitle}</h3>
	
	<div class="betting-options">
		<button 
			class="bet-button over"
			on:click={() => placeBet(overMarketId, 'over', overOdds, overLine)}
		>
			<div class="bet-label">Over {overLine}</div>
			<div class="odds">{overOdds > 0 ? '+' : ''}{overOdds}</div>
		</button>
		
		<button 
			class="bet-button under"
			on:click={() => placeBet(underMarketId, 'under', underOdds, overLine)}
		>
			<div class="bet-label">Under {overLine}</div>
			<div class="odds">{underOdds > 0 ? '+' : ''}{underOdds}</div>
		</button>
	</div>
</div>

<style>
	.market-card {
		background: linear-gradient(135deg, var(--bg-secondary) 0%, #1f2937 100%);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		margin-bottom: var(--space-4);
		position: relative;
		transition: all 0.3s ease;
	}

	.market-card:hover {
		border-color: var(--sakura-pink);
		box-shadow: 0 4px 20px rgba(255, 183, 197, 0.1);
	}

	.event-title {
		font-size: 1.1rem;
		margin-bottom: var(--space-4);
		color: var(--text-primary);
		font-weight: 600;
	}

	.betting-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
	}

	.bet-button {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.bet-button:hover {
		background: var(--primary-light);
		border-color: var(--sakura-pink);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 183, 197, 0.15);
	}

	.bet-button:active {
		transform: translateY(0);
	}

	.bet-label {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.odds {
		font-size: 1.1rem;
		font-weight: bold;
		color: var(--success);
	}
</style>