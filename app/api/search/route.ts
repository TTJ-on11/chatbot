import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    
    // 访问 Google 搜索
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
    
    // 等待搜索结果加载
    await page.waitForSelector('#search')
    
    // 提取搜索结果
    const content = await page.evaluate(() => {
      const results = document.querySelectorAll('#search .g')
      return Array.from(results, result => {
        const title = result.querySelector('h3')?.textContent || ''
        const snippet = result.querySelector('.VwiC3b')?.textContent || ''
        return `${title}\n${snippet}\n\n`
      }).join('')
    })
    
    await browser.close()
    
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    )
  }
} 