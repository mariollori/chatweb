import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client'
import { Mensaje } from './mensaje';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  private stomp: Client;
  mensaje: Mensaje = new Mensaje();
  conectado: boolean = false;
  mensajes: Mensaje[] = [];
  escribiendop: string;
  url: string = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjeZlA20YvSshhUW08KhTPMSnJwZXYCT19YQ&usqp=CAU"
  clienteId: string;

  constructor() {
    /**Todo para generar un id que no se pueda repetir */
    this.clienteId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit() {
    console.log("hola");

    /**Le asignamos el sockjs para que stomp trabaje con
     * este ,tal y ocmo lo indicamos en el backend
     * y como argumento le pasamos la ruta para conectarnos
     * al servidor.
     */
    this.stomp = new Client();
    this.stomp.webSocketFactory = () => {
      return new SockJS("http://localhost:70/chat-websocket");
    }
    /**para ver si nos conectamos
     * el objeto frame contiene toda la 
     * informacion de nusestra conexion
     * con el broker
     */

    this.stomp.onConnect = (frame) => {
      console.log("hola");
      this.conectado = true;
      console.log('Conectados: ' + this.stomp.connected + ' : ' + frame)

      /**Nos suscribimos a un evento al conectarnos
       * este sirve para que si alguien envia un mensaje
       * todos los miembros suscritos lo recibiran
       */



      this.stomp.subscribe('/chat/mensaje', e => {
        /***Obtenemos el mensaje */
        /**Convertimos el e.body de tipo string a un objeto de tipo mensaje */
        let mensaje: Mensaje = JSON.parse(e.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);

        if (!this.mensaje.color && mensaje.tipo == "USERNAME" && this.mensaje.username == mensaje.username) {
          this.mensaje.color = mensaje.color;

        }

        this.mensajes.push(mensaje);
        console.log(mensaje)
      })
      this.stomp.subscribe('/chat/escribiendo', e => {
        this.escribiendop = e.body;
        setTimeout(() => {
          this.escribiendop = '';
        }, 500);
      })
      /**ya que enviamos abajo el id aca nos devuelve los mensajes */
      this.stomp.subscribe('/chat/historial/' + this.clienteId, e => {
        const historial = JSON.parse(e.body) as Mensaje[];
        this.mensajes = historial.map(m => {
          m.fecha = new Date(m.fecha);
          /*no te olvides de retornar la variable modificada o el objeto*/
          return m;
        })
          /**ya que vienen de manera desc 
           * ejem desde el 50 al 41
           * nosotros queremos que empiezen a mostrarse delsde el 41 poe
           * eso el reverse
           */
          .reverse()
      })
      /**al conectarnos enviamos al bakend para que nos devuelva los ultimos 10 mensajes */
      this.stomp.publish({ destination: '/app/historial', body: this.clienteId })

      this.mensaje.tipo = "USERNAME";
      this.stomp.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) })


    }
    /** con el anterior metodo solo estabamos escuchando
     * si nos conectabamos
     * para conectarnos
     * utilizamos el metodo
     * activate.
    */
    this.stomp.onDisconnect = (frame) => {

      this.conectado = false;
      console.log('Desconectados: ' + !this.stomp.connected + ' : ' + frame)
      this.mensajes = [];
      this.mensaje = new Mensaje();
    }

  }
  conectar(): void {
    this.stomp.activate();
  }
  desconectar(): void {

    this.mensaje.tipo = "DESCONECTADO";
    this.mensaje.texto = "El usuario " + this.mensaje.username + " se desconecto....";
    this.stomp.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) })
    this.stomp.deactivate();
  }

  escribiendo(): void {
    this.stomp.publish({ destination: '/app/escribiendo', body: this.mensaje.username })
  }

  enviarMensaje(): void {
    /**para publicar un mensaje el metodo publish 
     * primer y unico argumento es un objeto
     * y este objeto tiene atributos
     * destination:la ruta
     * body que debe ser de tipo string
     * asi que convertimos el objeto a string.
     */
    this.mensaje.tipo = "MENSAJE"
    this.stomp.publish({ destination: '/app/mensaje', body: JSON.stringify(this.mensaje) })
    this.mensaje.texto = ' ';
  }

}
