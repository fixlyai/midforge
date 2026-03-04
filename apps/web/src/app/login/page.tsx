import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/world');

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="forge-panel max-w-md w-full mx-4 text-center">
        <h1 className="font-pixel text-xl text-forge-amber mb-4">MIDFORGE</h1>
        <p className="font-pixel text-[10px] text-forge-wheat/70 mb-8 leading-relaxed">
          Authenticate with X to enter.
          <br />
          Your verified stats become your power.
        </p>

        <form
          action={async () => {
            'use server';
            await signIn('twitter', { redirectTo: '/world' });
          }}
        >
          <button type="submit" className="forge-btn text-xs w-full">
            Sign in with X →
          </button>
        </form>

        <p className="font-pixel text-[8px] text-forge-wheat/30 mt-6">
          We read your public follower count.
          <br />
          We never post without your permission.
        </p>
      </div>
    </main>
  );
}
