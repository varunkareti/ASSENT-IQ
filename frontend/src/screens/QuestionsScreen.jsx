import { useSession } from '../state/sessionContext';
import ChatBox from '../components/ChatBox';

export default function QuestionsScreen() {
  const { state, dispatch } = useSession();

  const handleContinue = () => {
    dispatch({ type: 'SET_SCREEN', payload: 3 });
  };

  return (
    <div className="page">

      <ChatBox
        sessionId={state.session?.id}
        onMessagesChange={() => {}}
      />

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          className="btn btn-secondary"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 1 })}
        >
          Back to Explanation
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          Continue to Signature
        </button>
      </div>
    </div>
  );
}