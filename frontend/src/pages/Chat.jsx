import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { api } from '../api'

const STARTERS = ['로그인은 어떻게 하나요?', '집 주소는 어디에 넣나요?', '회사 근처 맛집 어디가 좋아요?', '프로젝트 분석기는 뭔가요?']

const WELCOME = {
  role: 'assistant',
  content: '안녕하세요. DevHaven 이용을 도와드릴게요. 로그인, 집 주소, 채용, 맛집, 게시판, 프로젝트 분석기 중에서 궁금한 점을 물어봐 주세요.',
}

export default function Chat() {
  const [messages, setMessages] = useState([WELCOME])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const send = async (raw) => {
    const content = (raw ?? text).trim()
    if (!content || sending) return
    const history = [
      ...messages.filter((message) => message !== WELCOME).map(({ role, content: body }) => ({ role, content: body })),
      { role: 'user', content },
    ]
    setMessages((prev) => [...prev, { role: 'user', content }])
    setText('')
    setError('')
    setSending(true)
    try {
      const res = await api.sendChat(history)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setError(err.message || '답변을 받지 못했습니다.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <section className="chat-page">
      <header className="chat-head">
        <h1 className="h4 mb-1">
          <i className="bi bi-chat-dots me-2" />
          챗봇
        </h1>
        <p className="text-secondary mb-0">DevHaven 메뉴와 FAQ를 기준으로 이용 방법을 안내합니다.</p>
      </header>

      <div className="chat-panel">
        <div className="chat-log" ref={listRef}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble chat-bubble-${message.role}`}>
              {message.content}
            </div>
          ))}
          {sending ? <div className="chat-bubble chat-bubble-assistant chat-typing">답변을 준비하고 있습니다…</div> : null}
        </div>

        <div className="chat-starters">
          {STARTERS.map((item) => (
            <button key={item} type="button" className="chat-chip" disabled={sending} onClick={() => send(item)}>
              {item}
            </button>
          ))}
        </div>

        {error ? (
          <Alert variant="danger" className="mb-2 py-2">
            {error}
          </Alert>
        ) : null}

        <Form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <Form.Control
            ref={inputRef}
            value={text}
            placeholder="궁금한 점을 입력하세요"
            maxLength={2000}
            disabled={sending}
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" disabled={sending || !text.trim()}>
            보내기
          </Button>
        </Form>
      </div>
    </section>
  )
}
