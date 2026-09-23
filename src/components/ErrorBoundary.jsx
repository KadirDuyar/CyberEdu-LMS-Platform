import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CyberEdu Uygulama Hatası Yakalandı:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto">
              ⚠️
            </div>
            <h2 className="font-display font-black text-2xl text-white">
              Bir Şeyler Ters Gitti
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sayfa yüklenirken beklenmeyen bir hata oluştu. Sayfayı yenileyebilir veya giriş sayfasına dönebilirsiniz.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs font-mono text-left overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/30"
              >
                Giriş Ekranına Git
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
