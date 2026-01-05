import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log("API_BASE_URL:", API_BASE_URL);

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
  const [, setPendingUserInput] = useState<string>('');
  const [error, setError] = useState<string>('');



const MarkdownMessage = ({ content, isUser }: { content: string; isUser: boolean }) => {
  return (
    <div className={isUser ? 'user-message' : 'ai-message'}>
      <ReactMarkdown
        components={{
          ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>
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
      const response = await fetch(`${API_BASE_URL}/conversations/`);
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: number) => {
  try {
    setIsLoading(true);
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }
    
    const fetchedMessages = await response.json(); // Parse the JSON!
    setMessages(fetchedMessages);
    setError(''); 
  } catch (error) {
    console.error('Error fetching messages:', error);
    setError('Failed to load messages');
  } finally {
    setIsLoading(false);
  }
};





  const createConversation = async (title: string): Promise<Conversation> => {
    const response = await fetch(`${API_BASE_URL}/conversations/`, {
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
    `${API_BASE_URL}/conversations/${conversationId}/messages`,
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
    const conversation = conversations.find(c => c.id === conversationId) || null;
    setCurrentConversation(conversation);
    setError(''); 
    await fetchMessages(conversationId); 
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    setError('Failed to load conversation');
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
  setError(''); 

  
  setPendingUserInput(userInput);

  try {
    let conversationId = currentConversation?.id;
    
    if (!currentConversation) {
      const title = userInput.substring(0, 50); 
      const newConversation = await createConversation(title);
      setCurrentConversation(newConversation);
      conversationId = newConversation.id;
      fetchConversations();
    }

  
    console.log('Sending message to backend...');
    const aiResponse = await createMessage(conversationId!, userInput);
    
    console.log('Received AI response:', aiResponse);
    

    await fetchMessages(conversationId!);
    

    setPendingUserInput('');

  } catch (error: any) {
    console.error('Error sending message:', error);
    
    
    setError(`Failed to send message: ${error.message || 'Please try again'}`);
    
    
    setInput(userInput);
    
  } finally {
    setIsLoading(false);
    setPendingUserInput('');
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
        {/* Error Display */}
        {error && (
          <div className='bg-red-50 border border-red-200 p-3 mx-4 mt-4 rounded-lg flex justify-between items-center'>
            <span className='text-red-700 flex-1'>{error}</span>
            <button 
              onClick={() => setError('')}
              className='text-red-500 hover:text-red-700 text-xl ml-2'
            >
              ×
            </button>
          </div>
        )}
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