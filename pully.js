/**
 * Pully.js - Pull to Refresh Library
 * @version 1.0.0
 * @author Pablo Martínez
 * @license MIT
 *
 * Uso:
 *   const pully = new Pully('#container', { onRefresh: () => {...} });
 *   pully.destroy();
 */

(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory())
    : typeof define === "function" && define.amd
      ? define(factory)
      : ((global = typeof globalThis !== "undefined" ? globalThis : global || self),
        (global.Pully = factory()));
})(this, function () {
  "use strict";

  const styles = `
    .pully-container {
      position: relative;
      overflow: hidden;
    }
    .pully-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(99, 102, 241, 0.1);
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 10;
    }
    .pully-bar--active {
      opacity: 1;
    }
    .pully-bar__fill {
      height: 100%;
      background: #6366f1;
      width: 0%;
      transition: width 0.1s ease;
    }
    .pully-grip-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      z-index: 10;
      pointer-events: none;
    }
    .pully-grip {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 4px;
      background: rgba(99, 102, 241, 0.5);
      border-radius: 2px;
      transition: background 0.2s ease, transform 0.2s ease;
      pointer-events: auto;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    .pully-grip:active {
      cursor: grabbing;
    }
    .pully-grip--active {
      background: #6366f1;
      transform: translateX(-50%) scaleX(1.2);
    }
    .pully-message {
      position: absolute;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      color: #666;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.2s ease;
      white-space: nowrap;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      pointer-events: none;
    }
    .pully-message--active {
      opacity: 1;
    }
    .pully-hint {
      font-weight: 500;
      background-color: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0.5rem;
      font-size: 0.5rem;
    }
    .pully-refreshing {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      z-index: 10;
    }
    .pully-refreshing--active {
      opacity: 1;
    }
    .pully-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: pully-spin 1s linear infinite;
    }
    @keyframes pully-spin {
      to { transform: rotate(360deg); }
    }
    .pully-content {
      transition: transform 0.2s ease;
      padding-top: 60px;
      margin-top: -60px;
    }
  `;

  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected || typeof document === "undefined") return;
    const styleSheet = document.createElement("style");
    styleSheet.id = "pully-styles";
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    stylesInjected = true;
  }

  class Pully {
    constructor(container, options = {}) {
      if (typeof document === "undefined") {
        console.warn("Pully: Solo funciona en el navegador");
        return;
      }

      injectStyles();

      this.container =
        typeof container === "string"
          ? document.querySelector(container)
          : container;

      if (!this.container) {
        console.warn("Pully: Contenedor no encontrado");
        return;
      }

      this.onRefresh = options.onRefresh || (() => { });
      this.onRelease = options.onRelease || (() => { });
      this.threshold = options.threshold || 100;
      this.refreshing = false;
      this.startY = 0;
      this.currentY = 0;
      this.isDragging = false;
      this.pullDistance = 0;
      this.pullProgress = 0;

      this.container.classList.add("pully-container");

      this.bar = document.createElement("div");
      this.bar.className = "pully-bar";
      this.bar.innerHTML = '<div class="pully-bar__fill"></div>';
      this.container.insertBefore(this.bar, this.container.firstChild);

      this.gripContainer = document.createElement("div");
      this.gripContainer.className = "pully-grip-container";
      this.container.insertBefore(this.gripContainer, this.container.firstChild.nextSibling);

      this.grip = document.createElement("div");
      this.grip.className = "pully-grip";
      this.gripContainer.appendChild(this.grip);

      this.message = document.createElement("div");
      this.message.className = "pully-message";
      this.message.innerHTML = '<span class="pully-hint">Arrastra para actualizar</span>';
      this.gripContainer.appendChild(this.message);

      this.refreshingIndicator = document.createElement("div");
      this.refreshingIndicator.className = "pully-refreshing";
      this.refreshingIndicator.innerHTML = '<div class="pully-spinner"></div>';
      this.gripContainer.appendChild(this.refreshingIndicator);

      this.content = document.createElement("div");
      this.content.className = "pully-content";
      while (this.container.firstChild) {
        this.content.appendChild(this.container.firstChild);
      }
      this.container.appendChild(this.content);

      this.bindEvents();
    }

    bindEvents() {
      this.grip.addEventListener("touchstart", this.onTouchStart.bind(this), {
        passive: true,
      });
      this.grip.addEventListener("touchmove", this.onTouchMove.bind(this), {
        passive: false,
      });
      this.grip.addEventListener("touchend", this.onTouchEnd.bind(this), {
        passive: true,
      });
      this.grip.addEventListener("mousedown", this.onMouseDown.bind(this));
      document.addEventListener("mousemove", this.onMouseMove.bind(this));
      document.addEventListener("mouseup", this.onMouseUp.bind(this));
    }

    onTouchStart(e) {
      if (this.refreshing) return;
      this.startY = e.touches[0].clientY;
      this.isDragging = true;
    }

    onTouchMove(e) {
      if (!this.isDragging || this.refreshing) return;
      e.preventDefault();
      this.currentY = e.touches[0].clientY;
      this.updatePull(this.currentY - this.startY);
    }

    onTouchEnd() {
      if (!this.isDragging || this.refreshing) return;
      this.endPull();
    }

    onMouseDown(e) {
      if (this.refreshing) return;
      this.startY = e.clientY;
      this.isDragging = true;
    }

    onMouseMove(e) {
      if (!this.isDragging || this.refreshing) return;
      this.currentY = e.clientY;
      this.updatePull(this.currentY - this.startY);
    }

    onMouseUp() {
      if (!this.isDragging || this.refreshing) return;
      this.endPull();
    }

    updatePull(deltaY) {
      if (deltaY <= 0) {
        this.bar.classList.remove("pully-bar--active");
        this.grip.classList.remove("pully-grip--active");
        this.message.classList.remove("pully-message--active");
        this.bar.querySelector(".pully-bar__fill").style.width = "0%";
        return;
      }

      this.pullDistance = deltaY;
      this.pullProgress = Math.min((deltaY / this.threshold) * 100, 100);

      this.bar.classList.add("pully-bar--active");
      this.grip.classList.add("pully-grip--active");
      this.message.classList.add("pully-message--active");
      this.bar.querySelector(".pully-bar__fill").style.width = `${this.pullProgress}%`;

      if (deltaY > this.threshold) {
        this.message.querySelector(".pully-hint").textContent = "¡Suelta!";
      } else {
        this.message.querySelector(".pully-hint").textContent = "Arrastra para actualizar";
      }
    }

    async endPull() {
      this.isDragging = false;
      const deltaY = this.currentY - this.startY;

      if (deltaY > this.threshold && !this.refreshing) {
        this.refreshing = true;
        this.bar.classList.add("pully-bar--active");
        this.bar.querySelector(".pully-bar__fill").style.width = "100%";
        this.grip.classList.remove("pully-grip--active");
        this.message.classList.remove("pully-message--active");
        this.refreshingIndicator.classList.add("pully-refreshing--active");

        this.onRelease();

        try {
          await this.onRefresh();
        } catch (error) {
          console.error("Pully: Error en refresh", error);
        } finally {
          this.finishRefresh();
        }
      } else {
        this.bar.classList.remove("pully-bar--active");
        this.grip.classList.remove("pully-grip--active");
        this.message.classList.remove("pully-message--active");
        this.bar.querySelector(".pully-bar__fill").style.width = "0%";
      }

      this.currentY = 0;
    }

    finishRefresh() {
      this.refreshing = false;
      this.bar.classList.remove("pully-bar--active");
      this.grip.classList.remove("pully-grip--active");
      this.refreshingIndicator.classList.remove("pully-refreshing--active");
      this.bar.querySelector(".pully-bar__fill").style.width = "0%";
    }

    destroy() {
      this.grip?.removeEventListener("touchstart", this.onTouchStart);
      this.grip?.removeEventListener("touchmove", this.onTouchMove);
      this.grip?.removeEventListener("touchend", this.onTouchEnd);
      this.grip?.removeEventListener("mousedown", this.onMouseDown);
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("mouseup", this.onMouseUp);

      this.bar?.remove();
      this.gripContainer?.remove();
      this.message?.remove();
      this.refreshingIndicator?.remove();
      this.content?.remove();
      this.container?.classList.remove("pully-container");
    }
  }

  Pully.version = "1.0.0";

  return Pully;
});
