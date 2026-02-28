//
//  Item.swift
//  PolyBans
//
//  Created by Yusuf Afifi on 28/02/2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
