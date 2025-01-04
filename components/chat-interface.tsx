'use client'

import { useState, FormEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Paperclip, Globe, Mic } from 'lucide-react'

// 定义消息类型
type Message = {
  role: 'user' | 'assistant'
  content: string
}

type APIError = {
  message: string;
  error?: {
    message: string;
  };
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [webEnabled, setWebEnabled] = useState(false)

  const handleWebToggle = () => {
    setWebEnabled(!webEnabled)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const newMessages = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      let finalContent = input
      
      if (webEnabled) {
        try {
          const searchResponse = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input })
          })
          
          const searchData = await searchResponse.json()
          finalContent = `用户问题: ${input}\n\n搜索结果: ${searchData.content}\n\n请根据以上搜索结果回答用户问题。`
        } catch (error) {
          console.error('Search error:', error)
          finalContent = `${input} (注：搜索功能暂时发生错误，将直接回答)`
        }
      }

      const requestBody = {
        model: "Qwen/Qwen2.5-7B-Instruct",
        messages: [...messages, { role: 'user', content: finalContent }].map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })) as { role: 'user' | 'assistant'; content: string }[],
        stream: false,
        temperature: 0.7,
        max_tokens: 2048,
      }

      console.log('Request Body:', requestBody);
      
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log('API Response:', data)
      console.log('Response status:', response.status)
      
      // 修改错误处理，显示具体错误信息
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${data.error?.message || JSON.stringify(data)}`)
      }

      if (!data.choices?.[0]?.message?.content) {
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`)
      }

      // 添加 AI 响应
      setMessages(messages => [...messages, {
        role: 'assistant' as const,
        content: data.choices[0].message.content
      }])
    } catch (error: unknown) {
      const err = error as APIError;
      console.error('Error details:', err);
      setMessages(messages => [...messages, {
        role: 'assistant' as const,
        content: `Error: ${err.message || '未知错误'}`
      }]);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col">
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg" alt="User Avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full gap-2 items-center">
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={webEnabled ? '联网模式已开启' : '给"AI"发送消息'}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            variant={webEnabled ? "default" : "outline"} 
            size="icon" 
            type="button" 
            disabled={isLoading}
            onClick={handleWebToggle}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
            <Mic className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

