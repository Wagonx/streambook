<script>
	import { createEventDispatcher } from 'svelte';
	import { getEstimatedSinglePayout } from '$lib/supabase.js';
	
	export let market;
	export let userStake = 10;

	const dispatch = createEventDispatcher();

	$: totalPot = market.side_a_total + market.side_b_total;
	$: sideAPercentage = totalPot > 0 ? (market.side_a_total / totalPot) * 100 : 50;
	$: sideBPercentage = totalPot > 0 ? (market.side_b_total / totalPot) * 100 : 50;

	$: estimatedPayoutA = getEstimatedSinglePayout(userStake, 'side_a', market);
	$: estimatedPayoutB = getEstimatedSinglePayout(userStake, 'side_b', market);

	function placeBet(side) {
		dispatch('placeBet', {
			marketId: market.id,
			side,
			stake: userStake,
			marketTitle: market.title,
			sideLabel: side === 'side_a' ? market.side_a_label : market.side_b_label
		});
	}
</script>

<div class="market-card">
	<div class="market-header">
		<h3 class="market-title">{market.title}</h3>
		<div class="total-pot">Total Pot: <span class="pot-amount">{totalPot} coins</span></div>
	</div>
	
	<div class="pot-visualization">
		<div class="pot-bar">
			<div class="side-a-bar" style="width: {sideAPercentage}%"></div>
			<div class="side-b-bar" style="width: {sideBPercentage}%"></div>
		</div>
		<div class="pot-labels">
			<span class="side-label">{market.side_a_total} coins ({sideAPercentage.toFixed(0)}%)</span>
			<span class="side-label">{market.side_b_total} coins ({sideBPercentage.toFixed(0)}%)</span>
		</div>
	</div>

	<div class="betting-options">
		<button 
			class="bet-button side-a"
			on:click={() => placeBet('side_a')}
			disabled={market.status !== 'open'}
		>
			<div class="bet-label">{market.side_a_label}</div>
			<div class="payout-info">
				<div class="current-pot">{market.side_a_total} coins</div>
				<div class="estimated-payout">~{Math.round(estimatedPayoutA)} payout</div>
			</div>
		</button>
		
		<button 
			class="bet-button side-b"
			on:click={() => placeBet('side_b')}
			disabled={market.status !== 'open'}
		>
			<div class="bet-label">{market.side_b_label}</div>
			<div class="payout-info">
				<div class="current-pot">{market.side_b_total} coins</div>
				<div class="estimated-payout">~{Math.round(estimatedPayoutB)} payout</div>
			</div>
		</button>
	</div>

	<div class="stake-input">
		<label for="stake-{market.id}">Your Stake:</label>
		<input 
			id="stake-{market.id}"
			type="number" 
			bind:value={userStake}
			min="1"
			step="1"
		/>
	</div>
</div>

<style>
	.market-card {
		background: linear-gradient(135deg, var(--bg-secondary) 0%, #1f2937 100%);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		margin-bottom: var(--space-4);
		transition: all 0.3s ease;
	}

	.market-card:hover {
		border-color: var(--sakura-pink);
		box-shadow: 0 4px 20px rgba(255, 183, 197, 0.1);
	}

	.market-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.market-title {
		font-size: 1.1rem;
		color: var(--text-primary);
		font-weight: 600;
		margin: 0;
	}

	.total-pot {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.pot-amount {
		color: var(--sakura-pink);
		font-weight: bold;
	}

	.pot-visualization {
		margin-bottom: var(--space-4);
	}

	.pot-bar {
		height: 8px;
		background: var(--bg-tertiary);
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		margin-bottom: 0.5rem;
	}

	.side-a-bar {
		background: linear-gradient(90deg, var(--success), #48bb78);
		transition: width 0.3s ease;
	}

	.side-b-bar {
		background: linear-gradient(90deg, var(--sakura-pink), #f687b3);
		transition: width 0.3s ease;
	}

	.pot-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.betting-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.bet-button {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.bet-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 183, 197, 0.15);
	}

	.bet-button.side-a:hover:not(:disabled) {
		border-color: var(--success);
		background: rgba(56, 161, 105, 0.1);
	}

	.bet-button.side-b:hover:not(:disabled) {
		border-color: var(--sakura-pink);
		background: rgba(255, 183, 197, 0.1);
	}

	.bet-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.bet-label {
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.payout-info {
		font-size: 0.85rem;
	}

	.current-pot {
		color: var(--text-secondary);
	}

	.estimated-payout {
		color: var(--sakura-pink);
		font-weight: bold;
	}

	.stake-input {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.stake-input label {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.stake-input input {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 0.5rem;
		color: var(--text-primary);
		width: 80px;
	}
</style>