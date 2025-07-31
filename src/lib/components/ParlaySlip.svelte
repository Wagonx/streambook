<script>
	import { supabase } from '$lib/supabase.js';
	import { createEventDispatcher, onMount } from 'svelte';

	export let selectedLegs = [];
	export let user;
	export let userCoins = 1000;

	const dispatch = createEventDispatcher();

	let parlayStake = 25;
	let parlayPot = 0;
	let isPlacing = false;
	let totalParlayBets = 0;

	$: isValidParlay = selectedLegs.length >= 2;
	$: estimatedPayout = isValidParlay ? calculateEstimatedParlayPayout() : 0;

	onMount(async () => {
		await loadParlayPot();
		setupParlayPotSubscription();
	});

	async function loadParlayPot() {
		const { data } = await supabase
			.from('parlay_pot')
			.select('*')
			.single();
		
		if (data) {
			parlayPot = data.total_pot;
		}

		// Count total parlay bets for estimation
		const { count } = await supabase
			.from('parlay_bets')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'pending');
		
		totalParlayBets = count || 0;
	}

	function setupParlayPotSubscription() {
		supabase
			.channel('parlay-pot-updates')
			.on('postgres_changes', 
				{ event: 'UPDATE', schema: 'public', table: 'parlay_pot' },
				(payload) => {
					parlayPot = payload.new.total_pot;
				}
			)
			.subscribe();
	}

	function calculateEstimatedParlayPayout() {
		if (!isValidParlay) return 0;
		
		// Estimate: if this parlay wins and it's the only winner
		// In reality, multiple parlays could win, splitting the pot
		const newParlayPot = parlayPot + parlayStake;
		
		// Conservative estimate: assume 25% of parlays win (very optimistic for parlays)
		const estimatedWinningStakes = Math.max(parlayStake, (totalParlayBets * 25 + parlayStake) * 0.25);
		
		return Math.round((parlayStake / estimatedWinningStakes) * newParlayPot);
	}

	function removeLeg(index) {
		selectedLegs = selectedLegs.filter((_, i) => i !== index);
	}

	function clearParlay() {
		selectedLegs = [];
	}

	async function placeParlayBet() {
		if (!user || !isValidParlay || parlayStake <= 0 || parlayStake > userCoins) {
			return;
		}

		isPlacing = true;

		try {
			// Place the parlay bet
			const { error: parlayError } = await supabase
				.from('parlay_bets')
				.insert({
					user_id: user.id,
					legs: selectedLegs,
					total_stake: parlayStake
				});

			if (parlayError) throw parlayError;

			// Add stake to parlay pot
			const { error: potError } = await supabase
				.from('parlay_pot')
				.update({ total_pot: parlayPot + parlayStake })
				.eq('id', (await supabase.from('parlay_pot').select('id').single()).data.id);

			if (potError) throw potError;

			// Update user coins
			const { error: userError } = await supabase
				.from('users')
				.update({ 
					coins: userCoins - parlayStake,
					total_bets: (await getUserBetCount()) + 1
				})
				.eq('user_id', user.id);

			if (userError) throw userError;

			// Clear parlay slip and notify parent
			selectedLegs = [];
			parlayStake = 25;
			dispatch('parlayPlaced');

		} catch (error) {
			console.error('Error placing parlay:', error);
			alert('Error placing parlay bet. Please try again.');
		} finally {
			isPlacing = false;
		}
	}

	async function getUserBetCount() {
		const { count: singleCount } = await supabase
			.from('single_bets')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);
		
		const { count: parlayCount } = await supabase
			.from('parlay_bets')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);
		
		return (singleCount || 0) + (parlayCount || 0);
	}
</script>

{#if selectedLegs.length > 0}
	<div class="parlay-slip">
		<div class="parlay-header">
			<h3>🌸 Parlay Builder</h3>
			<div class="parlay-pot">Parlay Pot: <span class="pot-amount">{parlayPot} coins</span></div>
			<button on:click={clearParlay} class="clear-btn">Clear All</button>
		</div>

		<div class="parlay-legs">
			{#each selectedLegs as leg, index}
				<div class="parlay-leg">
					<div class="leg-details">
						<div class="leg-market">{leg.marketTitle}</div>
						<div class="leg-selection">{leg.sideLabel}</div>
					</div>
					<button on:click={() => removeLeg(index)} class="remove-leg">×</button>
				</div>
			{/each}
		</div>

		<div class="parlay-stake">
			<label for="parlayStake">Parlay Stake:</label>
			<input 
				id="parlayStake"
				type="number" 
				bind:value={parlayStake}
				min="1"
				max={userCoins}
				step="1"
			/>
		</div>

		<div class="parlay-summary">
			<div class="summary-row">
				<span>Legs:</span>
				<span>{selectedLegs.length}</span>
			</div>
			<div class="summary-row">
				<span>Total Parlay Pot:</span>
				<span class="pot-highlight">{parlayPot} coins</span>
			</div>
			<div class="summary-row">
				<span>Estimated Payout:</span>
				<span class="payout-estimate">~{estimatedPayout} coins</span>
			</div>
			<div class="summary-row risk-warning">
				<span>⚠️ All legs must win!</span>
			</div>
		</div>

		<button 
			on:click={placeParlayBet}
			disabled={isPlacing || !isValidParlay || parlayStake <= 0 || parlayStake > userCoins}
			class="place-parlay-btn"
			class:valid={isValidParlay}
		>
			{#if isPlacing}
				Placing Parlay...
			{:else if !isValidParlay}
				Need {2 - selectedLegs.length} more leg{2 - selectedLegs.length !== 1 ? 's' : ''}
			{:else}
				Place Parlay ({selectedLegs.length} legs)
			{/if}
		</button>
	</div>
{/if}

<style>
	.parlay-slip {
		background: linear-gradient(135deg, var(--bg-secondary) 0%, #1f2937 100%);
		border: 2px solid var(--sakura-pink);
		border-radius: var(--border-radius);
		padding: var(--space-4);
		margin-top: var(--space-6);
		position: relative;
	}

	.parlay-slip::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent 0%, var(--sakura-pink) 50%, transparent 100%);
		opacity: 0.8;
	}

	.parlay-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-color);
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.parlay-header h3 {
		color: var(--sakura-pink);
		margin: 0;
		font-size: 1.2rem;
	}

	.parlay-pot {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.pot-amount {
		color: var(--sakura-pink);
		font-weight: bold;
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

	.parlay-legs {
		margin-bottom: var(--space-4);
	}

	.parlay-leg {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2);
		margin-bottom: var(--space-2);
		background: var(--bg-tertiary);
		border-radius: var(--border-radius);
		border-left: 3px solid var(--sakura-pink);
	}

	.leg-details {
		flex: 1;
	}

	.leg-market {
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.leg-selection {
		font-size: 0.85rem;
		color: var(--sakura-pink);
		font-weight: bold;
	}

	.remove-leg {
		background: transparent;
		color: var(--text-secondary);
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0.25rem;
	}

	.remove-leg:hover {
		color: var(--danger);
	}

	.parlay-stake {
		margin: var(--space-4) 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.parlay-stake label {
		color: var(--text-primary);
		font-weight: 500;
	}

	.parlay-stake input {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 0.5rem;
		color: var(--text-primary);
		width: 100px;
	}

	.parlay-summary {
		margin: var(--space-4) 0;
		padding: var(--space-4);
		background: var(--bg-tertiary);
		border-radius: var(--border-radius);
		border: 1px solid var(--sakura-pink);
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

	.pot-highlight {
		color: var(--sakura-pink);
		font-weight: bold;
	}

	.payout-estimate {
		color: var(--success);
		font-weight: bold;
		font-size: 1.1rem;
	}

	.risk-warning {
		border-top: 1px solid var(--border-color);
		padding-top: 0.5rem;
		margin-top: 0.5rem;
		color: var(--danger) !important;
		font-weight: bold;
		justify-content: center;
	}

	.place-parlay-btn {
		width: 100%;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 2px solid var(--border-color);
		padding: 0.75rem;
		border-radius: var(--border-radius);
		font-weight: bold;
		cursor: not-allowed;
		transition: all 0.3s;
		font-size: 1rem;
	}

	.place-parlay-btn.valid:not(:disabled) {
		background: linear-gradient(135deg, var(--sakura-pink) 0%, #f687b3 100%);
		color: white;
		border-color: var(--sakura-pink);
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(255, 183, 197, 0.3);
	}

	.place-parlay-btn.valid:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(255, 183, 197, 0.4);
	}

	@media (max-width: 768px) {
		.parlay-header {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}
	}
</style>