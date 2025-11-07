"use client"

import React from "react"

type LoaderOverlayProps = {
  message?: string
}

export function LoaderOverlay({
  message = "Cargando información",
}: LoaderOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-50 flex flex-col items-center gap-6 px-6">
        {/* Loader metaball agua */}
        <div
          className="
            loader-metaball
            select-none
            w-28 h-28
            sm:w-40 sm:h-40
            md:w-56 md:h-56
            lg:w-64 lg:h-64
            xl:w-72 xl:h-72
          "
        >
          <svg viewBox="0 0 500 500" className="loader-metaball-svg">
            <g className="arm">
              <line className="segment" x1={250} y1={250} x2={300} y2={250} />
              <circle className="joint" cx={250} cy={250} r={64} />
              <g className="arm1">
                <line className="segment" x1={300} y1={250} x2={400} y2={250} />
                <circle className="joint" cx={300} cy={250} r={30} />
                <g className="arm2">
                  <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                  <circle className="joint" cx={400} cy={250} r={24} />
                  <g className="arm3">
                    <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                    <circle className="joint" cx={490} cy={250} r={16} />
                  </g>
                </g>

                {/* sub brazos extra para efecto fluido */}
                <g className="arm1">
                  <line className="segment" x1={300} y1={250} x2={400} y2={250} />
                  <circle className="joint" cx={300} cy={250} r={30} />
                  <g className="arm2">
                    <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                    <circle className="joint" cx={400} cy={250} r={8} />
                    <g className="arm3">
                      <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                      <circle className="joint" cx={490} cy={250} r={8} />
                    </g>

                    <g className="arm2">
                      <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                      <circle className="joint" cx={400} cy={250} r={8} />
                      <g className="arm3">
                        <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                        <circle className="joint" cx={490} cy={250} r={8} />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>

            <g id="loader-mir" className="arm">
              <line className="segment" x1={250} y1={250} x2={300} y2={250} />
              <circle className="joint" cx={250} cy={250} r={64} />
              <g className="arm1">
                <line className="segment" x1={300} y1={250} x2={400} y2={250} />
                <circle className="joint" cx={300} cy={250} r={30} />
                <g className="arm2">
                  <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                  <circle className="joint" cx={400} cy={250} r={24} />
                  <g className="arm3">
                    <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                    <circle className="joint" cx={490} cy={250} r={16} />
                  </g>
                </g>

                <g className="arm1">
                  <line className="segment" x1={300} y1={250} x2={400} y2={250} />
                  <circle className="joint" cx={300} cy={250} r={30} />
                  <g className="arm2">
                    <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                    <circle className="joint" cx={400} cy={250} r={8} />
                    <g className="arm3">
                      <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                      <circle className="joint" cx={490} cy={250} r={8} />
                    </g>

                    <g className="arm2">
                      <line className="segment" x1={400} y1={250} x2={490} y2={250} />
                      <circle className="joint" cx={400} cy={250} r={8} />
                      <g className="arm3">
                        <line className="segment" x1={490} y1={250} x2={550} y2={250} />
                        <circle className="joint" cx={490} cy={250} r={8} />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>

            <filter id="loader-metaball">
              <feGaussianBlur in="SourceGraphic" stdDeviation={17} result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  
                        0 1 0 0 0  
                        0 0 1 0 0  
                        0 0 0 100 -7"
                result="fluid"
              />
              <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
            </filter>
          </svg>
        </div>

        {/* Texto */}
        <div className="text-center">
          <p className="text-lg font-medium text-foreground/90">
            {message}
            <span className="loader-dots" aria-hidden="true" />
          </p>
          <p className="mt-1 text-xs text-foreground/60">
            Preparando panel y próximas ejecuciones…
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoaderOverlay
