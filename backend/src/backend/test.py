from llm import generate_llm_response

messages = [{"role": "user", "content": "Hello!"}]

print(generate_llm_response(messages))
