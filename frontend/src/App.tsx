import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Conversation = {
  id: number;
  title: string;
  created_at: string;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  conversation_id: number;
  created_at: string;
};



function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

 const MarkdownMessage = ({ content, isUser }: { content: string; isUser: boolean }) => {
  return (
    <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            // Add ': any' to fix TypeScript error temporarily
            // Or install @types/react-markdown for proper typing
            return inline ? (
              <code 
                className={`${isUser ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'} rounded px-1 py-0.5 text-sm font-mono`} 
                {...props}
              >
                {children}
              </code>
            ) : (
              <pre className={`${isUser ? 'bg-gray-800' : 'bg-gray-100'} rounded p-3 overflow-x-auto my-2`}>
                <code className="text-sm font-mono" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          ul({ node, children, ...props }: any) {
            return (
              <ul className="list-disc pl-5" {...props}>
                {children}
              </ul>
            );
          },
          ol({ node, children, ...props }: any) {
            return (
              <ol className="list-decimal pl-5" {...props}>
                {children}
              </ol>
            );
          },
          li({ node, children, ...props }: any) {
            return (
              <li className="my-1" {...props}>
                {children}
              </li>
            );
          },
          strong({ node, children, ...props }: any) {
            return (
              <strong className="font-semibold" {...props}>
                {children}
              </strong>
            );
          },
          em({ node, children, ...props }: any) {
            return (
              <em className="italic" {...props}>
                {children}
              </em>
            );
          },
          a({ node, children, href, ...props }: any) {
            return (
              <a 
                href={href} 
                className={`${isUser ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'} underline`} 
                target="_blank" 
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ node, children, ...props }: any) {
            return (
              <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
                {children}
              </h1>
            );
          },
          h2({ node, children, ...props }: any) {
            return (
              <h2 className="text-xl font-bold mt-3 mb-2" {...props}>
                {children}
              </h2>
            );
          },
          h3({ node, children, ...props }: any) {
            return (
              <h3 className="text-lg font-bold mt-2 mb-1" {...props}>
                {children}
              </h3>
            );
          },
          blockquote({ node, children, ...props }: any) {
            return (
              <blockquote 
                className={`border-l-4 ${isUser ? 'border-gray-500' : 'border-gray-300'} pl-4 my-2 italic`} 
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          p({ node, children, ...props }: any) {
            return (
              <p className="my-2" {...props}>
                {children}
              </p>
            );
          },
          hr({ node, ...props }: any) {
            return (
              <hr className={`my-4 ${isUser ? 'border-gray-600' : 'border-gray-300'}`} {...props} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};



  
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:8100/conversations/');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };





  const createConversation = async (title: string): Promise<Conversation> => {
    const response = await fetch('http://localhost:8100/conversations/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    return response.json();
  };

  const createMessage = async (
  conversationId: number,
  content: string
): Promise<Message> => {
  const response = await fetch(
    `http://localhost:8100/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
  }

  return response.json();
};



  
  const handleConversationClick = async (conversationId: number) => {
    try {
      setCurrentConversation(
        conversations.find(c => c.id === conversationId) || null
      );

      const response = await fetch(
        `http://localhost:8100/conversations/${conversationId}/messages`
      );
      const messagesData = await response.json();
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
    }
};


  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);

    const tempUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userInput,
      conversation_id: currentConversation?.id || 0,
      created_at: new Date().toISOString()
    };
    
  
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      let conversationId = currentConversation?.id;
      
      if (!currentConversation) {
        const title = "Conversation"; 
        const newConversation = await createConversation(title);
        
        setCurrentConversation(newConversation);
        conversationId = newConversation.id;
        
    
        fetchConversations();
      }

  
      console.log('Sending message to backend...');
      // const aiResponse = await createMessage({
      //   content: userInput,
      //   role: 'user',
      //   conversation_id: conversationId
      // });
      const aiResponse = await createMessage(conversationId!, userInput);

      
      console.log('Received AI response:', aiResponse);
      
     
      setMessages((prev) => [...prev, aiResponse]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message || 'Could not get response from AI'}`,
        conversation_id: currentConversation?.id || 0,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='flex h-screen bg-gray-100'>
      {/* Sidebar */}
      <div className='w-64 bg-gray-900 text-white p-4 flex flex-col'>
        <div className='mb-4'>
          <h1 className='text-xl font-bold'>DSTL Chat App</h1>
        </div>
        <button
          className='w-full py-2 px-4 border border-gray-600 rounded hover:bg-gray-800 text-left mb-4 disabled:opacity-50'
          onClick={handleNewChat}
          disabled={isLoading}
        >
          + New Chat
        </button>
        <div className='flex-1 overflow-y-auto'>
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-2 cursor-pointer hover:bg-gray-800 rounded ${
                currentConversation?.id === conversation.id ? 'bg-gray-700' : ''
              } ${isLoading ? 'opacity-50' : ''}`}
              onClick={() => !isLoading && handleConversationClick(conversation.id)}
            >
              <div className='font-medium truncate'>
                {conversation.title}
              </div>
              <div className='text-xs text-gray-400'>
                {new Date(conversation.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex flex-col'>
        {/* Messages Area */}
        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {msg.role === 'user' ? (
                  // For user messages, show plain text
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  // For AI messages, render markdown
                  <MarkdownMessage content={msg.content} isUser={false} />
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className='flex justify-start'>
              <div className='max-w-[70%] rounded-lg p-3 bg-white border border-gray-200'>
                <div className='flex items-center space-x-2'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'></div>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {messages.length === 0 && !isLoading && (
            <div className='text-center text-gray-500 mt-20'>
              <h2 className='text-2xl font-semibold'>
                Welcome to the DSTL Chat App
              </h2>
              <p>Start a conversation!</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className='p-4 border-t border-gray-200 bg-white'>
          <div className='flex gap-4 max-w-4xl mx-auto'>
            <textarea
              className='flex-1 border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'
              rows={1}
              placeholder='Type a message...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50'
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
          <div className='text-center text-xs text-gray-400 mt-2'>
            Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;