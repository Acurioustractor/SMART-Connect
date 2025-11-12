import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const interviewsPath = path.join(process.cwd(), '../knowledge-base/interviews')
    const filePath = path.join(interviewsPath, filename)

    // Security check: ensure file is within interviews directory
    if (!filePath.startsWith(interviewsPath)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    return NextResponse.json({ content })
  } catch (error: any) {
    console.error('Error fetching interview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interview', details: error.message },
      { status: 500 }
    )
  }
}
