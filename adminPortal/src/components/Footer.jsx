import { Mail, Phone, HelpCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="text-slate-900">HKMU MediaFlow</h3>
            <p className="text-slate-600 text-sm">
              Internal media processing and streaming platform for Hong Kong Metropolitan University.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 text-sm">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  User Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  System Status
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 text-sm">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  Submit Ticket
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 text-sm hover:text-blue-600 transition-colors">
                  Contact IT
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 text-sm">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-slate-600 text-sm">
                <Mail className="w-4 h-4" />
                <a href="mailto:it-support@hkmu.edu.hk" className="hover:text-blue-600 transition-colors">
                  it-support@hkmu.edu.hk
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-600 text-sm">
                <Phone className="w-4 h-4" />
                <span>+852 2768 6888</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 text-sm">
                <HelpCircle className="w-4 h-4" />
                <a href="#" className="hover:text-blue-600 transition-colors">
                  IT Help Desk
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm">Information Technology Services Office</p>
            <p className="text-slate-500 text-sm">For internal use only</p>
          </div>
          <p className="text-slate-500 text-xs text-center md:text-left mt-4">
            © 2025 Hong Kong Metropolitan University. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
