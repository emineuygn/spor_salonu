// Şifre gücü kontrolü (Ders 5: Events)
document.getElementById('sifre').addEventListener('input', function(e) {
    const pass = e.target.value;
    const strengthMsg = document.getElementById('passwordStrength');
    
    if(pass.length < 6) {
        strengthMsg.innerHTML = "Şifre çok kısa!";
        strengthMsg.style.color = "red";
    } else {
        strengthMsg.innerHTML = "Şifre gücü uygun.";
        strengthMsg.style.color = "#ccff00";
    }
});