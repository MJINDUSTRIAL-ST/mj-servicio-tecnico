"use client";

import { useState } from "react";

type Item = {
  descripcion: string;
  cantidad: number;
  unitario: number;
};

export default function CotizacionInterna() {

  const [items,setItems]=useState<Item[]>([
    {
      descripcion:"",
      cantidad:1,
      unitario:0
    }
  ]);

  function agregar(){

    setItems([
      ...items,
      {
        descripcion:"",
        cantidad:1,
        unitario:0
      }
    ]);

  }

  function actualizar(index:number,campo:keyof Item,valor:any){

    const copia=[...items];

    copia[index]={
      ...copia[index],
      [campo]:valor
    };

    setItems(copia);

  }

  const total=items.reduce(
    (a,b)=>a+b.cantidad*b.unitario,
    0
  );

  return(

<section className="card">

<div className="header">

<h2>Cotización Interna</h2>

<button onClick={agregar}>
Agregar Ítem
</button>

</div>

<table>

<thead>

<tr>

<th>Descripción</th>

<th>Un.</th>

<th>Valor Unitario</th>

<th>Total</th>

</tr>

</thead>

<tbody>

{items.map((item,i)=>(

<tr key={i}>

<td>

<input
value={item.descripcion}
onChange={(e)=>actualizar(i,"descripcion",e.target.value)}
/>

</td>

<td>

<input
type="number"
value={item.cantidad}
onChange={(e)=>actualizar(i,"cantidad",Number(e.target.value))}
/>

</td>

<td>

<input
type="number"
value={item.unitario}
onChange={(e)=>actualizar(i,"unitario",Number(e.target.value))}
/>

</td>

<td>

$

{(item.cantidad*item.unitario).toLocaleString()}

</td>

</tr>

))}

</tbody>

</table>

<div className="total">

TOTAL INTERNO

$

{total.toLocaleString()}

</div>

<style jsx>{`

.card{

background:white;

padding:20px;

border-radius:18px;

border:1px solid #e2e8f0;

margin-bottom:18px;

}

.header{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:20px;

}

button{

background:#2563eb;

color:white;

border:none;

padding:10px 16px;

border-radius:10px;

cursor:pointer;

font-weight:700;

}

table{

width:100%;

border-collapse:collapse;

}

th{

background:#f8fafc;

padding:12px;

text-align:left;

}

td{

padding:10px;

border-top:1px solid #e2e8f0;

}

input{

width:100%;

padding:8px;

border:1px solid #cbd5e1;

border-radius:8px;

}

.total{

margin-top:20px;

font-size:22px;

font-weight:800;

text-align:right;

}

`}</style>

</section>

  );

}