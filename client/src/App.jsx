import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ ping }' })
    })
      .then(res => res.json())
      .then(res => setMessage(res.data.ping))
      .catch(console.error);
  }, []);

  return <h1>Ping: {message}</h1>;
}

export default App;
