import React, { useEffect, useState } from 'react';
import './App.css';
import { YellowService } from './services/YellowService';

const App: React.FC = () => {
  const [yellowService] = useState(new YellowService());
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    const initYellow = async () => {
      try {
        await yellowService.connect();
        setIsConnected(true);
        const channelData = await yellowService.getAppSessions();
        setChannels(channelData);
      } catch (error) {
        console.error('Failed to connect to Yellow:', error);
      }
    };

    initYellow();

    return () => {
      yellowService.disconnect();
    };
  }, [yellowService]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Yellow App</h1>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
        <div>
          <h2>Channels</h2>
          <ul>
            {channels.map((channel, index) => (
              <li key={index}>{JSON.stringify(channel)}</li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
};

export default App;
