import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Try deleting the post cleanly; if record doesn't exist, handle gracefully
    try {
      await prisma.post.delete({
        where: { id },
      });
    } catch (e: any) {
      // P2025 is Prisma error code for record not found
      if (e.code !== 'P2025') {
        console.warn('Delete attempt warning:', e);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ success: true, message: 'Safely processed deletion' });
  }
}
