type Props={
foto:string|null;
cerrar:()=>void;
};

export default function ModalFoto({
foto,
cerrar
}:Props){

if(!foto) return null;

return(

<div
onClick={cerrar}
className="overlay"
>

<div
onClick={(e)=>e.stopPropagation()}
className="contenedor"
>

<button
onClick={cerrar}
>
×
</button>

<img
src={foto}
/>

</div>

<style jsx>{`

.overlay{

position:fixed;
inset:0;
background:rgba(0,0,0,.82);
display:flex;
justify-content:center;
align-items:center;
z-index:99999;

}

.contenedor{
position:relative;
}

button{

position:absolute;
right:-15px;
top:-15px;

width:42px;
height:42px;

border-radius:50%;
border:none;

background:white;

font-size:28px;

cursor:pointer;

}

img{

max-width:92vw;
max-height:92vh;

border-radius:16px;

}

`}</style>

</div>

);

}