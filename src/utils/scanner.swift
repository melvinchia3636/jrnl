import AVFoundation
import Vision
import CoreMedia
import Foundation

class Scanner: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let session = AVCaptureSession()
    var foundPayload: String?
    let semaphore = DispatchSemaphore(value: 0)

    func start() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            fputs("Error: Could not access default webcam device.\n", stderr)
            exit(1)
        }

        session.sessionPreset = .high
        if session.canAddInput(input) { session.addInput(input) }

        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        let queue = DispatchQueue(label: "camera.queue")
        output.setSampleBufferDelegate(self, queue: queue)

        if session.canAddOutput(output) { session.addOutput(output) }

        session.startRunning()

        _ = semaphore.wait(timeout: .now() + 45)
        session.stopRunning()

        if let payload = foundPayload {
            print(payload)
            exit(0)
        } else {
            fputs("Error: Scan timed out. No Data Matrix detected on camera.\n", stderr)
            exit(1)
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard foundPayload == nil,
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let request = VNDetectBarcodesRequest { [weak self] (req, err) in
            guard let self = self, self.foundPayload == nil else { return }
            guard let results = req.results as? [VNBarcodeObservation] else { return }

            for barcode in results {
                if let payload = barcode.payloadStringValue, !payload.isEmpty {
                    self.foundPayload = payload
                    self.semaphore.signal()
                    break
                }
            }
        }

        request.symbologies = [.dataMatrix, .qr]

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
        try? handler.perform([request])
    }
}

let scanner = Scanner()
scanner.start()
