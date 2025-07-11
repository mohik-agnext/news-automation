import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  // Create SSE stream with proper headers
  const stream = createSSEStream();
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 