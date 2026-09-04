import { NextResponse } from 'next/server';
import { getWorkspaceTree } from '@altrex/core/tools/index.js';

export async function GET() {
  try {
    const files = await getWorkspaceTree();
    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
