<script>
	import { supabase } from '$lib/supabase.js';
	import { createEventDispatcher } from 'svelte';

	export let selectedBets = [];
	export let user;
	export let userCoins = 1000;

	const dispatch = createEventDispatcher();

	let betAmount = 10;
	let isPlacing = false;

	$: totalOdds = selectedBets.length > 0 ? selectedBets.reduce((total, bet) => {
		// Convert American odds to decimal for calculation
		const decimal = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
		return total * decimal;
	}, 1) : 1;

	$: potentialPayout = Math.round(betAmount * totalOdds);
	$: profit = potentialPayout - betAmount;

	function removeBet(index) {
		selectedBets = selectedBets.filter((_, i) => i !== index);
	}

	function clearAll() {
		selectedBets = [];
	}

	async function placeBet() {
		if (!user || selectedBets.length === 0 || betAmount <= 0 || betAmount > userCoins) return;

		isPlacing = true;

		try {
			const betData = {
				user_id: user.id,
				markets: selectedBets.map(bet => ({
					marketId: bet.marketId,
					type: bet.type,
					odds: bet.odds,
					description: bet.description
				})),
				total_stake: betAmount,
				potential_payout: potentialPayout,
				type: selectedBets.length > 1 ? 'parlay' : 'single'
			};

			const { data, error } = await supabase
				.from('bets')
				.insert(betData);

			if (error) throw error;

			// Update user's coin balance
			const { error: updateError } = await supabase
				.from('users')
				.update({ 
					coins: userCoins - betAmount,
					total_bets: (await getUserBetCount()) + 1
				})
				.eq('user_id', user.id);

			if (updateError) throw updateError;

			// Clear the bet slip and notify parent
			selectedBets = [];
			betAmount = 10;
			dispatch('betPlaced');

		} catch (error) {
			console.error('Error placing bet:', error);
			alert('Error placing bet. Please try again.');
		} finally {
			isPlacing = false;
		}
	}

	async function getUserBetCount() {
		const { count } = await supabase
			.from('bets')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);
		return count || 0;
	}
</script>

{#if selectedBets.length > 0}
	<div class="bet-slip">
		<div class="bet-slip-header">
			<h3>Bet Slip</h3>
			<button on:click={clearAll} class="clear-btn">Clear All</button>
		</div>

		<div class="selected-bets">
			{#each selectedBets as bet, index}
				<div class="bet-item">
					<div class="bet-details">
						<div class="bet-desc">{bet.description}</div>
						<div class="bet-event">{bet.eventTitle}</div>
						<div class="bet-odds">{bet.odds > 0 ? '+' : ''}{bet.odds}</div>
					</div>
					<button on:click={() => removeBet(index)} class="remove-btn">×</button>
				</div>
			{/each}
		</div>

		<div class="bet-amount">
			<label for="betAmount">Bet Amount:</label>
			<input 
				id="betAmount"
				type="number" 
				bind:value={betAmount}
				min="1"
				max={userCoins}
				step="1"
			/>
		</div>

		<div class="bet-summary">
			<div class="summary-row">
				<span>Total Odds:</span>
				<span>{totalOdds.toFixed(2)}</span>
			</div>
			<div class="summary-row">
				<span>Potential Payout:</span>
				<span class="payout">{potentialPayout} coins</span>
			</div>
			<div class="summary-row profit">
				<span>Profit:</span>
				<span class="profit-amount">+{profit} coins</span>
			</div>
		</div>

		<button 
			on:click={placeBet}
			disabled={isPlacing || betAmount <= 0 || betAmount > userCoins}
			class="place-bet-btn"
		>
			{#if isPlacing}
				Placing Bet...
			{:else}
				Place Bet
			{/if}
		</button>
	</div>
{/if}

<style>
	.bet-slip {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		margin-top: var(--space-6);
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	.bet-slip-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-color);
	}

	.bet-slip-header h3 {
		color: var(--text-primary);
		margin: 0;
	}

	.clear-btn {
		background: transparent;
		color: var(--text-secondary);
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.clear-btn:hover {
		color: var(--danger);
	}

	.bet-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border-color);
	}

	.bet-item:last-child {
		border-bottom: none;
	}

	.bet-details {
		flex: 1;
	}

	.bet-desc {
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.bet-event {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.bet-odds {
		font-weight: bold;
		color: var(--success);
	}

	.remove-btn {
		background: transparent;
		color: var(--text-secondary);
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
		padding: 0.25rem;
	}

	.remove-btn:hover {
		color: var(--danger);
	}

	.bet-amount {
		margin: var(--space-4) 0;
	}

	.bet-amount label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
		font-weight: 500;
	}

	.bet-amount input {
		width: 100%;
		padding: 0.5rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		color: var(--text-primary);
		font-size: 1rem;
	}

	.bet-summary {
		margin: var(--space-4) 0;
		padding: var(--space-4);
		background: var(--bg-tertiary);
		border-radius: var(--border-radius);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
	}

	.summary-row:last-child {
		margin-bottom: 0;
	}

	.summary-row.profit {
		border-top: 1px solid var(--border-color);
		padding-top: 0.5rem;
		margin-top: 0.5rem;
	}

	.payout, .profit-amount {
		color: var(--success);
		font-weight: bold;
	}

	.place-bet-btn {
		width: 100%;
		background: var(--success);
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: var(--border-radius);
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}

	.place-bet-btn:hover:not(:disabled) {
		background: #2f855a;
	}

	.place-bet-btn:disabled {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		cursor: not-allowed;
	}
</style>