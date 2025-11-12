import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const analysisPath = path.join(process.cwd(), '../knowledge-base/interview-analysis')
    const analysisFile = path.join(analysisPath, `${name}.json`)

    // Check if analysis exists
    if (!fs.existsSync(analysisFile)) {
      return NextResponse.json(
        { error: 'Analysis not found', analyzed: false },
        { status: 404 }
      )
    }

    const analysisData = fs.readFileSync(analysisFile, 'utf-8')
    const analysis = JSON.parse(analysisData)

    return NextResponse.json({
      success: true,
      analysis,
      analyzed: true
    })
  } catch (error: any) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis', details: error.message },
      { status: 500 }
    )
  }
}
