import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || 'file';

    // Check if we have the token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set');
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is not set' },
        { status: 500 }
      );
    }

    // Read the body as an arrayBuffer to ensure it's fully received
    const arrayBuffer = await request.arrayBuffer();
    const blobFile = new Blob([arrayBuffer]);

    const blob = await put(filename, blobFile, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading blob:', error);
    return NextResponse.json(
      { error: 'Error uploading file: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

import { del } from '@vercel/blob';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlToDelete = searchParams.get('url');

  if (!urlToDelete) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  // Check if we have the token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is not set' },
      { status: 500 }
    );
  }

  try {
    await del(urlToDelete);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json(
      { error: 'Error deleting file' },
      { status: 500 }
    );
  }
}
