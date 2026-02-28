import Foundation

/// Intercepts all URLSession requests for testing. Register stub responses
/// via `MockURLProtocol.handler` before each test.
final class MockURLProtocol: URLProtocol {

    /// Set this before each test to control the response.
    /// Receives the URLRequest, returns (Data, HTTPURLResponse).
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Data, HTTPURLResponse))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }

        do {
            let (data, response) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

// MARK: - Test helpers

extension MockURLProtocol {

    /// Creates a URLSessionConfiguration that routes all traffic through MockURLProtocol.
    static var testConfiguration: URLSessionConfiguration {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        config.timeoutIntervalForRequest = 5
        return config
    }

    /// Convenience to make an HTTPURLResponse for a given URL.
    static func response(url: URL, statusCode: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }
}
