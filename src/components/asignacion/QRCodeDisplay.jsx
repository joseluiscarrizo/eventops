import QRCode from 'qrcode.react';

const QRCodeDisplay = () => {
  const urlToShare = "https://your-url-here.com"; // Replace with your URL

  const handleDownload = () => {
    const canvas = document.getElementById("qrCodeCanvas");
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "qrcode.png";
    link.click();
  };

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <QRCode id="qrCodeCanvas" value={urlToShare} size={256} />
      <div>
        <button onClick={handleDownload} style={{ margin: '10px' }}>
          Download QR Code
        </button>
        <button onClick={() => navigator.share({ title: 'QR Code', url: urlToShare })} style={{ margin: '10px' }}>
          Share QR Code
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;