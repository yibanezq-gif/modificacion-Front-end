/* main.js - lógica compartida con conexión a API */

const API_URL = 'http://localhost:3000/api';

// ---------- helpers para currentUser (solo para sesión local) ----------
function getCurrentUser(){ 
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}
function setCurrentUser(user){ 
  localStorage.setItem('currentUser', JSON.stringify(user)); 
}
function clearCurrentUser(){ 
  localStorage.removeItem('currentUser'); 
}

// ---------- registro ----------
async function registerUser(form){
  const nombres = form.nombres.value.trim();
  const apellidos = form.apellidos.value.trim();
  const telefono = form.telefono.value.trim();
  const correo = form.correo.value.trim().toLowerCase();
  const direccion = form.direccion.value.trim();
  const contraseña = form.contraseña.value;
  
  if(!nombres || !apellidos || !correo || !contraseña){ 
    alert('Complete los campos obligatorios'); 
    return false; 
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombres, apellidos, telefono, correo, direccion, contraseña })
    });

    const data = await response.json();

    if(data.success) {
      alert('Cuenta creada con éxito. Ahora inicia sesión.');
      window.location.href = 'ingreso.html';
      return true;
    } else {
      alert(data.message || 'Error al registrar usuario');
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión. Verifica que el servidor esté corriendo.');
    return false;
  }
}

// ---------- login ----------
async function loginUser(form){
  const correo = form.usuario.value.trim().toLowerCase();
  const contraseña = form.contraseña.value;

  if(!correo || !contraseña) {
    alert('Complete todos los campos');
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ correo, contraseña })
    });

    const data = await response.json();

    if(data.success && data.user) {
      setCurrentUser(data.user);
      window.location.href = 'servicio.html';
      return true;
    } else {
      alert(data.message || 'Usuario o contraseña incorrectos');
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión. Verifica que el servidor esté corriendo.');
    return false;
  }
}

// ---------- proteger páginas que requieren login ----------
function requireLogin(redirectTo='ingreso.html'){
  const user = getCurrentUser();
  if(!user){ 
    window.location.href = redirectTo; 
    return false; 
  }
  return true;
}

// ---------- mostrar productos filtrados por tipo ----------
async function renderProducts(containerId, tipo){
  const cont = document.getElementById(containerId);
  if(!cont) return;
  
  cont.innerHTML = '<div class="card">Cargando productos...</div>';

  try {
    const response = await fetch(`${API_URL}/productos?tipo=${tipo}`);
    const data = await response.json();

    if(!data.success) {
      cont.innerHTML = '<div class="card">Error al cargar productos</div>';
      return;
    }

    cont.innerHTML = '';
    
    if(data.productos.length === 0) {
      cont.innerHTML = '<div class="card">No hay productos disponibles</div>';
      return;
    }

    data.productos.forEach(p => {
      const div = document.createElement('div');
      div.className = 'product';
      div.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}" onerror="this.style.display='none'"/>
        <strong>${p.nombre}</strong>
        <div class="small">${p.descripcion}</div>
        <div class="space-between" style="margin-top:8px">
          <div class="small"><strong>$${parseFloat(p.precio).toLocaleString()}</strong></div>
          <button class="link-btn" onclick="addToCart(${p.id})">Seleccionar</button>
        </div>
      `;
      cont.appendChild(div);
    });
  } catch (error) {
    console.error('Error:', error);
    cont.innerHTML = '<div class="card">Error de conexión. Verifica que el servidor esté corriendo.</div>';
  }
}

// ---------- carrito ----------
async function addToCart(productId){
  const user = getCurrentUser();
  if(!user) {
    alert('Debes iniciar sesión para agregar productos al carrito');
    window.location.href = 'ingreso.html';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/carrito`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario_id: user.id,
        producto_id: productId,
        cantidad: 1
      })
    });

    const data = await response.json();

    if(data.success) {
      window.location.href = 'detalle-pedido.html';
    } else {
      alert(data.message || 'Error al agregar al carrito');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión. Verifica que el servidor esté corriendo.');
  }
}

async function renderCart(containerId){
  const cont = document.getElementById(containerId);
  if(!cont) return;
  
  const user = getCurrentUser();
  if(!user) {
    cont.innerHTML = '<div class="card">Debes iniciar sesión para ver el carrito</div>';
    return;
  }

  cont.innerHTML = '<div class="card">Cargando carrito...</div>';

  try {
    const response = await fetch(`${API_URL}/carrito/${user.id}`);
    const data = await response.json();

    if(!data.success) {
      cont.innerHTML = '<div class="card">Error al cargar el carrito</div>';
      return;
    }

    cont.innerHTML = '';

    if(data.items.length === 0) {
      cont.innerHTML = '<div class="card">No hay productos en el carrito.</div>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'cart-list';
    
    data.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <div>${item.nombre} x ${item.cantidad}</div>
        <div>$${item.subtotal.toLocaleString()}</div>
      `;
      list.appendChild(div);
    });

    const tot = document.createElement('div');
    tot.className = 'card';
    tot.innerHTML = `
      <div class="space-between">
        <strong>Total</strong>
        <strong>$${data.total.toLocaleString()}</strong>
      </div>
    `;

    cont.appendChild(list);
    cont.appendChild(tot);
  } catch (error) {
    console.error('Error:', error);
    cont.innerHTML = '<div class="card">Error de conexión. Verifica que el servidor esté corriendo.</div>';
  }
}

// confirmar pedido
async function confirmOrder(){
  const user = getCurrentUser();
  if(!user){ 
    alert('Debes iniciar sesión para confirmar pedido'); 
    window.location.href = 'ingreso.html'; 
    return; 
  }

  try {
    const response = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario_id: user.id
      })
    });

    const data = await response.json();

    if(data.success) {
      alert('Pedido confirmado con éxito. ¡Gracias!');
      window.location.href = 'servicio.html';
    } else {
      alert(data.message || 'Error al confirmar pedido');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión. Verifica que el servidor esté corriendo.');
  }
}

// logout simple
function logout(){
  clearCurrentUser();
  window.location.href = 'ingreso.html';
}
  
