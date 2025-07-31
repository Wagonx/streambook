<script>
	import { supabase } from '$lib/supabase.js';
	import { onMount } from 'svelte';

	/**
	 * @type {import("@supabase/auth-js").User | null}
	 */
	let user = null;
	let loading = true;

	onMount(async () => {
		// Get initial session
		const { data: { session } } = await supabase.auth.getSession();
		user = session?.user ?? null;
		
		// Listen for auth changes
		supabase.auth.onAuthStateChange(async (event, session) => {
			user = session?.user ?? null;
			
			// Create user record in database if they're new
			if (user && event === 'SIGNED_IN') {
				await createUserIfNeeded();
			}
		});
		
		loading = false;
	});

	async function signInWithTwitch() {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'twitch',
			options: {
				redirectTo: window.location.origin
			}
		});
		if (error) console.error('Error:', error);
	}

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) console.error('Error:', error);
	}

	async function createUserIfNeeded() {
		if (!user) return;

		// Check if user already exists
		const { data: existingUser } = await supabase
			.from('users')
			.select('*')
			.eq('user_id', user.id)
			.single();

		if (!existingUser) {
			// Create new user record
			const { error } = await supabase
				.from('users')
				.insert({
					user_id: user.id,
					twitch_username: user.user_metadata?.preferred_username || user.email,
					avatar_url: user.user_metadata?.avatar_url
				});
			
			if (error) console.error('Error creating user:', error);
		}
	}
</script>

{#if loading}
	<div class="auth-loading">Loading...</div>
{:else if user}
	<div class="user-info">
		{#if user.user_metadata?.avatar_url}
			<img src={user.user_metadata.avatar_url} alt="Avatar" class="avatar" />
		{/if}
		<span class="username">{user.user_metadata?.preferred_username || 'User'}</span>
		<button on:click={signOut} class="sign-out-btn">Sign Out</button>
	</div>
{:else}
	<button on:click={signInWithTwitch} class="twitch-login-btn">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
		</svg>
		Sign in with Twitch
	</button>
{/if}

<style>
	.twitch-login-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #9146ff;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.twitch-login-btn:hover {
		background: #7c3aed;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
	}

	.username {
		color: var(--text-primary);
		font-weight: 500;
	}

	.sign-out-btn {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		cursor: pointer;
		font-size: 0.875rem;
	}

	.sign-out-btn:hover {
		background: var(--danger);
		color: white;
	}

	.auth-loading {
		color: var(--text-secondary);
	}
</style>