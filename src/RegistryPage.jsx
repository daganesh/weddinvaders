import { useRsvpStatus } from './useRsvpStatus';
import { withProtocol } from './linkUtils';
import GateNotice from './GateNotice';
import './PagesShared.css';

export default function RegistryPage({ config }) {
  const { rsvped } = useRsvpStatus();
  if (!rsvped) return <GateNotice reason="rsvp" />;

  const url = config.text.registryUrl.trim();

  return (
    <div className="page-card">
      <h1 className="page-title">🎁 Gift Registry</h1>
      {url ? (
        <>
          <p className="page-lead">Your presence is the real gift — but if you'd like to spoil us anyway:</p>
          <a className="big-btn" href={withProtocol(url)} target="_blank" rel="noopener noreferrer">
            Visit Our Registry
          </a>
        </>
      ) : (
        <p className="page-lead">The registry isn't set up yet — check back soon!</p>
      )}
    </div>
  );
}
