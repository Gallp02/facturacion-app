export default function LoadingBar() {
  return (
    <div style={{
      width: '100%', height: 3, overflow: 'hidden', background: 'transparent',
      position: 'absolute', top: 0, left: 0, zIndex: 20, borderRadius: '12px 12px 0 0'
    }}>
      <div style={{
        height: '100%', width: '30%', background: 'linear-gradient(90deg, #3182ce, #63b3ed)',
        borderRadius: 2, animation: 'loadingSlide 0.8s ease-in-out infinite'
      }} />
      <style>{`@keyframes loadingSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}
