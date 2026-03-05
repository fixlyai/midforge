import { NextResponse } from 'next/server';

// GET /api/stats/online
// Returns count of Colyseus room connections (active WebSocket sessions)
export async function GET() {
  try {
    const colyseusUrl = process.env.COLYSEUS_URL ?? 'http://localhost:2567';
    const res = await fetch(`${colyseusUrl}/matchmake/`, {
      next: { revalidate: 10 },
    });
    const rooms = await res.json();
    const online = Array.isArray(rooms)
      ? rooms.reduce((sum: number, r: any) => sum + (r.clients ?? 0), 0)
      : 0;
    return NextResponse.json({ online });
  } catch {
    return NextResponse.json({ online: 0 });
  }
}
